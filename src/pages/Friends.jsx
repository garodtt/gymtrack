import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, Share2, Copy, Check, X, Dumbbell, Clock, Users, Pencil, Trophy, Handshake, Play, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fmt } from '../lib/progression'
import { useFeedback } from '../components/Feedback'

export default function Friends({ session }) {
  const userId = session.user.id
  const { confirm, toast } = useFeedback()
  const [params] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [friends, setFriends] = useState([])
  const [feed, setFeed] = useState([])
  const [ranking, setRanking] = useState([])
  const [joints, setJoints] = useState([])
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  async function load() {
    // garante que o perfil existe (tem o código de amigo)
    let { data: p } = await supabase.from('profiles_gymtrack').select('id, name, friend_code').eq('id', userId).maybeSingle()
    if (!p) {
      const res = await supabase.from('profiles_gymtrack').insert({ id: userId }).select('id, name, friend_code').single()
      p = res.data
    }
    setProfile(p)
    const [{ data: f }, { data: fd }] = await Promise.all([
      supabase.rpc('friends_list_gymtrack'),
      supabase.rpc('friend_feed_gymtrack', { p_limit: 30 }),
    ])
    supabase.rpc('weekly_ranking_gymtrack').then(({ data }) => setRanking(data ?? []))
    loadJoints()
    setFriends(f ?? [])
    setFeed(fd ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const incoming = friends.filter((f) => f.status === 'pending' && f.incoming)
  const outgoing = friends.filter((f) => f.status === 'pending' && !f.incoming)
  const accepted = friends.filter((f) => f.status === 'accepted')

  async function accept(f) {
    const { error } = await supabase.from('friendships_gymtrack').update({ status: 'accepted' }).eq('id', f.friendship_id)
    if (error) return toast(`Erro: ${error.message}`, 'error')
    toast(`Agora você e ${f.name} são amigos`)
    load()
  }

  async function remove(f, kind) {
    const texts = {
      friend: { title: `Desfazer amizade com ${f.name}?`, confirmText: 'Desfazer', done: 'Amizade desfeita' },
      decline: { title: `Recusar o pedido de ${f.name}?`, confirmText: 'Recusar', done: 'Pedido recusado' },
      cancel: { title: `Cancelar o pedido para ${f.name}?`, confirmText: 'Cancelar pedido', done: 'Pedido cancelado' },
    }[kind]
    if (!(await confirm({ ...texts, danger: true, cancelText: 'Voltar' }))) return
    const { error } = await supabase.from('friendships_gymtrack').delete().eq('id', f.friendship_id)
    if (error) return toast(`Erro: ${error.message}`, 'error')
    toast(texts.done)
    load()
  }

  // treinos em dupla dos últimos 14 dias (que eu criei ou que me mandaram)
  async function loadJoints() {
    const since = new Date(Date.now() - 14 * 86400000).toISOString()
    const { data: js } = await supabase.from('joint_workouts_gymtrack')
      .select('id, title, creator_id, partner_id, created_at, place')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(10)
    if (!js?.length) return setJoints([])
    const { data: done } = await supabase.from('workout_sessions_gymtrack')
      .select('joint_workout_id').in('joint_workout_id', js.map((j) => j.id)).not('finished_at', 'is', null)
    const doneIds = new Set((done ?? []).map((d) => d.joint_workout_id))
    setJoints(js.map((j) => ({ ...j, done: doneIds.has(j.id) })))
  }

  async function removeJoint(j) {
    if (!(await confirm({ title: `Excluir "${j.title}"?`, message: 'Some para os dois. Treinos já feitos continuam no histórico.', confirmText: 'Excluir', danger: true }))) return
    const { error } = await supabase.from('joint_workouts_gymtrack').delete().eq('id', j.id)
    if (error) return toast(`Erro: ${error.message}`, 'error')
    toast('Treino em dupla excluído'); loadJoints()
  }

  const friendName = (id) => friends.find((f) => f.friend_id === id)?.name ?? 'amigo'

  if (loading) return <p className="muted">Carregando…</p>

  return (
    <div className="stack">
      <h1>Amigos</h1>

      <MyProfile profile={profile} onSaved={(p) => setProfile(p)} />
      <AddFriend initialCode={params.get('codigo') ?? ''} myId={userId} onSent={load} />

      {incoming.length > 0 && (
        <section className="card">
          <h2>Pedidos recebidos</h2>
          <ul className="list">
            {incoming.map((f) => (
              <li key={f.friendship_id}>
                <span className="friend-name"><Avatar name={f.name} /> {f.name}</span>
                <span className="mini-actions">
                  <button className="mini danger-text" onClick={() => remove(f, 'decline')} aria-label="Recusar"><X size={18} /></button>
                  <button className="mini primary" onClick={() => accept(f)} aria-label="Aceitar"><Check size={18} /></button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="stack-tight">
        <h2 className="icon-text section-title"><Users size={18} /> Seus amigos {accepted.length > 0 && <span className="muted">· {accepted.length}</span>}</h2>
        {accepted.length === 0 ? (
          <p className="muted small-text">Você ainda não tem amigos no app. Compartilhe seu código acima para começar.</p>
        ) : (
          <ul className="list">
            {accepted.map((f) => (
              <li key={f.friendship_id}>
                <span className="friend-name">
                  <Avatar name={f.name} />
                  <span>
                    {f.name}
                    <small className="muted block">
                      {f.workouts_7d} treino{f.workouts_7d === 1 ? '' : 's'} na semana · {f.last_workout ? `último ${relative(f.last_workout)}` : 'ainda não treinou'}
                    </small>
                  </span>
                </span>
                <span className="mini-actions">
                  <Link className="button mini icon-text duo-btn" to={`/junto/novo?amigo=${f.friend_id}`} aria-label={`Treinar junto com ${f.name}`}>
                    <Handshake size={16} /> Treinar junto
                  </Link>
                  <button className="mini danger-text" onClick={() => remove(f, 'friend')} aria-label="Remover amigo"><X size={16} /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {outgoing.length > 0 && (
          <p className="muted small-text">
            Aguardando resposta: {outgoing.map((f, i) => (
              <span key={f.friendship_id}>{i > 0 && ', '}{f.name} <button className="link inline" onClick={() => remove(f, 'cancel')}>cancelar</button></span>
            ))}
          </p>
        )}
      </section>

      {joints.length > 0 && (
        <section className="card">
          <h2 className="icon-text"><Handshake size={18} /> Treinos em dupla</h2>
          <ul className="list">
            {joints.map((j) => {
              const other = friendName(j.creator_id === userId ? j.partner_id : j.creator_id)
              return (
                <li key={j.id}>
                  <span>
                    {j.title}
                    <small className="muted block">com {other} · {relative(j.created_at)}{j.done ? ' · feito' : ''}</small>
                  </span>
                  <span className="mini-actions">
                    <button className="mini danger-text" onClick={() => removeJoint(j)} aria-label="Excluir"><Trash2 size={16} /></button>
                    <button className={`mini icon-text ${j.done ? '' : 'primary'}`} onClick={() => navigate(`/junto/${j.id}`)}>
                      <Play size={14} fill="currentColor" /> {j.done ? 'De novo' : 'Treinar'}
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {ranking.length > 1 && (
        <section className="card">
          <h2 className="icon-text"><Trophy size={18} /> Ranking da semana</h2>
          <ol className="ranking">
            {ranking.map((r, i) => (
              <li key={r.user_id} className={r.is_me ? 'me' : ''}>
                <span className={`pos pos-${i + 1}`}>{i + 1}</span>
                <span className="friend-name grow"><Avatar name={r.name} /> {r.is_me ? 'Você' : r.name}</span>
                <span className="muted small-text">{r.workouts} treino{r.workouts === 1 ? '' : 's'}</span>
                <b className="xp">{fmt(r.week_xp)} XP</b>
              </li>
            ))}
          </ol>
          <small className="muted">Zera toda segunda-feira.</small>
        </section>
      )}

      <section className="stack-tight">
        <h2 className="icon-text section-title"><Dumbbell size={18} /> Atividade</h2>
        {feed.length === 0 ? (
          <p className="muted small-text">Os treinos dos seus amigos aparecem aqui.</p>
        ) : (
          <ul className="feed">
            {feed.map((s) => {
              const mins = Math.round((new Date(s.finished_at) - new Date(s.started_at)) / 60000)
              return (
                <li key={s.session_id} className="card feed-item">
                  <Avatar name={s.name} />
                  <div className="grow">
                    <p><b>{s.name}</b> treinou <b>{s.day_name ?? 'um treino livre'}</b></p>
                    <p className="muted small-text icon-text feed-meta">
                      <span className="icon-text"><Clock size={13} /> {mins} min</span>
                      <span>{s.sets} séries</span>
                      {Number(s.volume) > 0 && <span>{fmt(Math.round(s.volume))} kg levantados</span>}
                    </p>
                  </div>
                  <span className="muted small-text nowrap">{relative(s.started_at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

// ---------- meu perfil: nome e código ----------
function MyProfile({ profile, onSaved }) {
  const { toast } = useFeedback()
  const [editing, setEditing] = useState(!profile?.name)
  const [name, setName] = useState(profile?.name ?? '')
  const [copied, setCopied] = useState(false)
  const code = profile?.friend_code ?? '------'
  const link = `${window.location.origin}/amigos?codigo=${code}`

  async function save() {
    const clean = name.trim()
    if (!clean) return toast('Digite seu nome', 'error')
    const { data, error } = await supabase.from('profiles_gymtrack').update({ name: clean }).eq('id', profile.id).select('id, name, friend_code').single()
    if (error) return toast(`Erro: ${error.message}`, 'error')
    onSaved(data); setEditing(false); toast('Nome salvo')
  }

  async function share() {
    const text = `Bora treinar junto no GymTrack! Meu código de amigo é ${code}: ${link}`
    if (navigator.share) {
      try { await navigator.share({ title: 'GymTrack', text }) } catch { /* cancelou */ }
    } else {
      await navigator.clipboard?.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
      toast('Convite copiado')
    }
  }

  return (
    <section className="card stack-tight">
      {editing ? (
        <div className="stack-tight">
          <label>Como seus amigos vão te ver
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome ou apelido" maxLength={30} />
          </label>
          <button className="primary" onClick={save}>Salvar nome</button>
        </div>
      ) : (
        <div className="row-between">
          <span className="friend-name"><Avatar name={profile?.name} big /> <b>{profile?.name}</b></span>
          <button className="mini" onClick={() => setEditing(true)} aria-label="Editar nome"><Pencil size={16} /></button>
        </div>
      )}
      <div className="code-box">
        <div>
          <small className="muted">Seu código de amigo</small>
          <div className="code">{code}</div>
        </div>
        <div className="mini-actions">
          <button className="mini" onClick={async () => { await navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }} aria-label="Copiar código">
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <button className="primary icon-text" onClick={share}><Share2 size={16} /> Convidar</button>
        </div>
      </div>
    </section>
  )
}

// ---------- adicionar por código ----------
function AddFriend({ initialCode, myId, onSent }) {
  const { toast } = useFeedback()
  const [code, setCode] = useState(initialCode.toUpperCase())
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (initialCode) lookup(initialCode) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function lookup(c = code) {
    const clean = c.trim().toUpperCase()
    if (clean.length !== 6) return toast('O código tem 6 caracteres', 'error')
    setBusy(true)
    const { data, error } = await supabase.rpc('find_profile_by_code_gymtrack', { p_code: clean })
    setBusy(false)
    if (error) return toast(`Erro: ${error.message}`, 'error')
    if (!data?.length) { setFound(null); return toast('Nenhum usuário com esse código', 'error') }
    setFound(data[0])
  }

  async function send() {
    const { error } = await supabase.from('friendships_gymtrack').insert({ requester_id: myId, addressee_id: found.id })
    if (error) {
      return toast(error.code === '23505' ? 'Vocês já são amigos ou já existe um pedido' : `Erro: ${error.message}`, 'error')
    }
    toast(`Pedido enviado para ${found.name}`)
    setFound(null); setCode('')
    onSent()
  }

  return (
    <section className="card stack-tight">
      <h2 className="icon-text"><UserPlus size={18} /> Adicionar amigo</h2>
      <form className="row-gap" onSubmit={(e) => { e.preventDefault(); lookup() }}>
        <input className="code-input" value={code} maxLength={6} placeholder="CÓDIGO"
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setFound(null) }} autoCapitalize="characters" />
        <button disabled={busy}>{busy ? '…' : 'Buscar'}</button>
      </form>
      {found && (
        <div className="row-between found">
          <span className="friend-name"><Avatar name={found.name} /> {found.name}</span>
          <button className="primary" onClick={send}>Enviar pedido</button>
        </div>
      )}
    </section>
  )
}

// ---------- utilidades ----------
function Avatar({ name, big }) {
  const initials = (name ?? '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const hue = [...(name ?? '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return <span className={`avatar ${big ? 'big' : ''}`} style={{ background: `hsl(${hue} 45% 32%)` }}>{initials || '?'}</span>
}

function relative(date) {
  const d = new Date(date)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const day = new Date(d); day.setHours(0, 0, 0, 0)
  const diff = Math.round((today - day) / 86400000)
  if (diff <= 0) return `hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  if (diff === 1) return 'ontem'
  if (diff < 7) return `há ${diff} dias`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}