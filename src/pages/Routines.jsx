import { useEffect, useState } from 'react'
import { Pencil, Trash2, Sparkles, Dumbbell, House, Clock, CalendarDays, Signal } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { saveRoutine, WEEKDAYS } from '../lib/data'
import { useFeedback } from '../components/Feedback'
import { isHome, unitShort, PLACES, LEVELS, GOALS } from '../lib/exercise'
import FilterSelect from '../components/FilterSelect'

const SELECT = '*, routine_days:routine_days_gymtrack(*, routine_exercises:routine_exercises_gymtrack(*, exercises:exercises_gymtrack(id, name, unit)))'

export default function Routines({ session }) {
  const userId = session.user.id
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [mine, setMine] = useState([])
  const [params] = useSearchParams()
  const { confirm, toast } = useFeedback()
  const [tab, setTab] = useState(params.get('aba') ?? 'ia')
  const [filters, setFilters] = useState({ place: 'todos', level: 'todos', goal: 'todos', days: 'todos' })

  async function load() {
    const { data } = await supabase.from('routines_gymtrack').select(SELECT).order('created_at', { ascending: false })
    const sorted = (data ?? []).map((r) => ({
      ...r,
      routine_days: r.routine_days.sort((a, b) => a.day_order - b.day_order).map((d) => ({
        ...d,
        routine_exercises: d.routine_exercises.sort((a, b) => a.position - b.position),
      })),
    }))
    setTemplates(sorted.filter((r) => r.is_template))
    setMine(sorted.filter((r) => !r.is_template))
  }
  useEffect(() => { load() }, [])

  async function applyTemplate(t) {
    await saveRoutine(
      {
        name: t.name,
        description: t.description,
        source: 'template',
        place: t.place,
        days: t.routine_days.map((d) => ({
          name: d.name,
          exercises: d.routine_exercises.map((re) => ({ ...re, exercise_id: re.exercise_id })),
        })),
      },
      userId,
    )
    toast('Rotina adicionada e ativada')
    navigate('/')
  }

  async function removeRoutine(r) {
    const ok = await confirm({
      title: `Excluir "${r.name}"?`,
      message: 'O histórico de treinos continua salvo.' +
        (r.is_active ? ' Esta é a sua rotina ativa: a tela Hoje ficará sem treino até você ativar outra.' : ''),
      confirmText: 'Excluir',
      danger: true,
    })
    if (!ok) return
    const { error } = await supabase.from('routines_gymtrack').delete().eq('id', r.id)
    if (error) return toast(`Erro ao excluir: ${error.message}`, 'error')
    toast('Rotina excluída')
    load()
  }

  async function activate(id) {
    await supabase.from('routines_gymtrack').update({ is_active: false }).eq('user_id', userId)
    await supabase.from('routines_gymtrack').update({ is_active: true }).eq('id', id)
    toast('Rotina ativada')
    navigate('/')
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h1>Rotinas</h1>
        <Link className="button icon-text" to="/agenda"><CalendarDays size={16} /> Agenda</Link>
      </div>
      <div className="tabs">
        <button className={tab === 'ia' ? 'active' : ''} onClick={() => setTab('ia')}>Gerar com IA</button>
        <button className={tab === 'modelos' ? 'active' : ''} onClick={() => setTab('modelos')}>Modelos</button>
        <button className={tab === 'minhas' ? 'active' : ''} onClick={() => setTab('minhas')}>Minhas</button>
      </div>

      {tab === 'ia' && <AiGenerator session={session} onSaved={() => navigate('/')} />}

      {tab === 'modelos' && (
        <>
          <TemplateFilters value={filters} onChange={setFilters} />
          {(() => {
            const list = filterTemplates(templates, filters)
            return (
              <>
                <div className="row-between">
                  <span className="muted small-text">{list.length} modelo{list.length === 1 ? '' : 's'}</span>
                  {Object.values(filters).some((v) => v !== 'todos') && (
                    <button className="link" onClick={() => setFilters({ place: 'todos', level: 'todos', goal: 'todos', days: 'todos' })}>limpar filtros</button>
                  )}
                </div>
                {list.map((t) => (
                  <RoutineCard key={t.id} routine={t} action={<button className="primary" onClick={() => applyTemplate(t)}>Usar esta rotina</button>} />
                ))}
                {list.length === 0 && <p className="muted">Nenhum modelo com esses filtros. Que tal gerar um com a IA?</p>}
              </>
            )
          })()}
        </>
      )}

      {tab === 'minhas' && (mine.length === 0 ? <p className="muted">Nenhuma rotina salva ainda.</p> :
        mine.map((r) => (
          <RoutineCard key={r.id} routine={r} action={<>
            <button className="danger-outline icon-btn" onClick={() => removeRoutine(r)} aria-label="Excluir rotina"><Trash2 size={18} /></button>
            <Link className="button icon-text" to={`/rotinas/${r.id}/editar`}><Pencil size={16} /> Editar</Link>
            {r.is_active ? <span className="badge">Ativa</span> : <button onClick={() => activate(r.id)}>Ativar</button>}
          </>} />
        )))}
    </div>
  )
}

function RoutineCard({ routine, action }) {
  return (
    <section className="card">
      <h2>{routine.name} {routine.source === 'ai' && <span className="badge">IA</span>} <PlaceBadge place={routine.place} /></h2>
      <RoutineMeta routine={routine} />
      {routine.description && <p className="muted">{routine.description}</p>}
      {routine.routine_days.map((d) => (
        <details key={d.id}>
          <summary>{d.name} · {d.routine_exercises.length} exercícios{d.weekdays?.length ? ` · ${d.weekdays.map((w) => WEEKDAYS[w]).join(', ')}` : ''}</summary>
          <ul className="list small">
            {d.routine_exercises.map((re) => (
              <li key={re.id}><span>{re.exercises?.name}</span><span className="muted">{re.sets} × {re.reps_min}–{re.reps_max} {unitShort(re.exercises)}</span></li>
            ))}
          </ul>
        </details>
      ))}
      <div className="row-end">{action}</div>
    </section>
  )
}

const LEVEL_ORDER = { iniciante: 1, intermediario: 2, avancado: 3 }

function filterTemplates(list, f) {
  return list
    .filter((t) => f.place === 'todos' || t.place === f.place)
    .filter((t) => f.level === 'todos' || t.level === f.level)
    .filter((t) => f.goal === 'todos' || t.goal === f.goal)
    .filter((t) => f.days === 'todos' || (f.days === '5' ? t.days_per_week >= 5 : String(t.days_per_week) === f.days))
    .sort((a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9) || (a.days_per_week ?? 0) - (b.days_per_week ?? 0))
}

function TemplateFilters({ value, onChange }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v })
  return (
    <div className="filters filters-grid">
      <FilterSelect label="Local" value={value.place} onChange={set('place')}
        options={[['todos', 'Todos'], ['academia', 'Academia'], ['casa', 'Casa']]} />
      <FilterSelect label="Nível" value={value.level} onChange={set('level')}
        options={[['todos', 'Todos'], ...Object.entries(LEVELS)]} />
      <FilterSelect label="Objetivo" value={value.goal} onChange={set('goal')}
        options={[['todos', 'Todos'], ...Object.entries(GOALS)]} />
      <FilterSelect label="Dias por semana" value={value.days} onChange={set('days')}
        options={[['todos', 'Qualquer'], ['2', '2 dias'], ['3', '3 dias'], ['4', '4 dias'], ['5', '5 ou mais']]} />
    </div>
  )
}

function RoutineMeta({ routine }) {
  if (!routine.level && !routine.days_per_week) return null
  return (
    <div className="meta-row">
      {routine.level && <span className="icon-text"><Signal size={14} /> {LEVELS[routine.level]}</span>}
      {routine.days_per_week && <span className="icon-text"><CalendarDays size={14} /> {routine.days_per_week}x/semana</span>}
      {routine.session_minutes && <span className="icon-text"><Clock size={14} /> ~{routine.session_minutes} min</span>}
      {routine.goal && <span className="badge muted-badge">{GOALS[routine.goal]}</span>}
    </div>
  )
}

function PlaceBadge({ place }) {
  if (!place) return null
  const Icon = place === 'casa' ? House : Dumbbell
  return <span className="badge icon-text"><Icon size={12} /> {PLACES[place]}</span>
}

function AiGenerator({ session, onSaved }) {
  const [profile, setProfile] = useState(null)
  const [extra, setExtra] = useState('')
  const [plan, setPlan] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [place, setPlace] = useState('academia')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      // busca o perfil; se não existir (usuário criado antes das tabelas), cria agora
      let { data: p } = await supabase.from('profiles_gymtrack').select('*').eq('id', session.user.id).maybeSingle()
      if (!p) {
        const { data: created, error } = await supabase
          .from('profiles_gymtrack')
          .insert({ id: session.user.id })
          .select()
          .single()
        if (error) return setError(`Erro ao criar perfil: ${error.message}`)
        p = created
      }
      setProfile(p)
      const { data: c } = await supabase.from('exercises_gymtrack').select('id, name, muscle_group, equipment, unit')
      setCatalog(c ?? [])
    })()
  }, [session.user.id])

  if (!profile) return error ? <p className="error">{error}</p> : <p className="muted">Carregando perfil…</p>
  const set = (k, v) => setProfile((p) => ({ ...p, [k]: v }))

  async function generate(e) {
    e.preventDefault()
    setLoading(true); setError(null); setPlan(null)
    await supabase.from('profiles_gymtrack').update({
      goal: profile.goal, level: profile.level, days_per_week: profile.days_per_week,
      session_minutes: profile.session_minutes, equipment: profile.equipment, notes: profile.notes,
    }).eq('id', session.user.id)
    try {
      const res = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ profile, catalog: place === 'casa' ? catalog.filter(isHome) : catalog, extra, place }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`)
      setPlan(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    await saveRoutine({ ...plan, source: 'ai', place }, session.user.id)
    onSaved()
  }

  const nameOf = (id) => catalog.find((c) => c.id === id)?.name ?? `#${id}`

  return (
    <div className="stack">
      <form className="card stack" onSubmit={generate}>
        <label>Objetivo
          <select value={profile.goal} onChange={(e) => set('goal', e.target.value)}>
            <option value="hipertrofia">Hipertrofia</option>
            <option value="forca">Força</option>
            <option value="emagrecimento">Emagrecimento</option>
            <option value="condicionamento">Condicionamento</option>
          </select>
        </label>
        <label>Nível
          <select value={profile.level} onChange={(e) => set('level', e.target.value)}>
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
        </label>
        <div className="grid2">
          <label>Dias/semana
            <input type="number" min="1" max="7" value={profile.days_per_week} onChange={(e) => set('days_per_week', Number(e.target.value))} />
          </label>
          <label>Minutos/treino
            <input type="number" min="20" max="180" step="5" value={profile.session_minutes} onChange={(e) => set('session_minutes', Number(e.target.value))} />
          </label>
        </div>
        <div className="stack-tight">
          <span className="label-text">Onde você vai treinar?</span>
          <div className="tabs">
            <button type="button" className={`icon-text ${place === 'academia' ? 'active' : ''}`} onClick={() => setPlace('academia')}><Dumbbell size={16} /> Academia</button>
            <button type="button" className={`icon-text ${place === 'casa' ? 'active' : ''}`} onClick={() => setPlace('casa')}><House size={16} /> Casa</button>
          </div>
          {place === 'casa' && <span className="muted small-text">A IA vai usar só exercícios com peso corporal, cadeira, mesa ou barra fixa.</span>}
        </div>
        <label>Equipamentos (separados por vírgula)
          <input value={(profile.equipment ?? []).join(', ')} onChange={(e) => set('equipment', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        </label>
        <label>Lesões ou limitações
          <input value={profile.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="ex.: dor no ombro direito" />
        </label>
        <label>Pedido extra (opcional)
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="ex.: foco em glúteos" />
        </label>
        <button className="primary icon-text" disabled={loading}>{loading ? 'Gerando…' : <><Sparkles size={18} /> Gerar treino com IA</>}</button>
        {error && <p className="error">{error}</p>}
      </form>

      {plan && (
        <section className="card">
          <h2>{plan.name} <span className="badge">IA</span> <PlaceBadge place={place} /></h2>
          <p className="muted">{plan.description}</p>
          {plan.days.map((d, i) => (
            <div key={i}>
              <h3>{d.name}</h3>
              <ul className="list small">
                {d.exercises.map((e, j) => (
                  <li key={j}><span>{nameOf(e.exercise_id)}</span><span className="muted">{e.sets} × {e.reps_min}–{e.reps_max} {unitShort(catalog.find((c) => c.id === e.exercise_id))} · {e.rest_seconds}s</span></li>
                ))}
              </ul>
            </div>
          ))}
          <div className="row-end">
            <button onClick={() => setPlan(null)}>Descartar</button>
            <button className="primary" onClick={save}>Salvar e ativar</button>
          </div>
        </section>
      )}
    </div>
  )
}