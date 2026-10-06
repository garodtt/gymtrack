import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Dumbbell, Handshake, Moon, X, House, CalendarDays } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { GROUPS } from '../lib/exercise'
import { WEEK_ORDER, WEEKDAY_LONG, loadMyAgenda, loadAgendaWithMe } from '../lib/agenda'
import FilterSelect from '../components/FilterSelect'
import { useFeedback } from '../components/Feedback'

const PICKABLE = ['peito', 'costas', 'ombros', 'biceps', 'triceps', 'pernas', 'gluteos', 'panturrilha', 'core', 'cardio']

export default function Agenda() {
  const { confirm, toast } = useFeedback()
  const [items, setItems] = useState([])
  const [withMe, setWithMe] = useState([])
  const [routines, setRoutines] = useState([])
  const [friends, setFriends] = useState([])
  const [adding, setAdding] = useState(null) // weekday
  const today = new Date().getDay()

  async function load() {
    const [a, w] = await Promise.all([loadMyAgenda(), loadAgendaWithMe()])
    setItems(a); setWithMe(w)
  }
  useEffect(() => {
    load()
    supabase.from('routines_gymtrack')
      .select('id, name, is_active, routine_days:routine_days_gymtrack(id, name, day_order)')
      .eq('is_template', false).order('created_at', { ascending: false })
      .then(({ data }) => setRoutines((data ?? []).map((r) => ({ ...r, routine_days: r.routine_days.sort((a, b) => a.day_order - b.day_order) }))))
    supabase.rpc('friends_list_gymtrack').then(({ data }) => setFriends((data ?? []).filter((f) => f.status === 'accepted')))
  }, [])

  const friendName = (id) => friends.find((f) => f.friend_id === id)?.name ?? 'amigo'

  async function remove(item) {
    if (!(await confirm({ title: 'Tirar da agenda?', confirmText: 'Tirar', danger: true }))) return
    const { error } = await supabase.from('schedule_gymtrack').delete().eq('id', item.id)
    if (error) return toast(`Erro: ${error.message}`, 'error')
    toast('Removido da agenda'); load()
  }

  return (
    <div className="stack">
      <Link to="/" className="muted back icon-text"><ArrowLeft size={16} /> Hoje</Link>
      <h1 className="icon-text"><CalendarDays size={26} /> Agenda da semana</h1>
      <p className="muted small-text">Monte sua semana misturando treinos das suas rotinas, treinos com amigos e descanso. A tela Hoje segue esta agenda.</p>

      {WEEK_ORDER.map((wd) => {
        const mine = items.filter((i) => i.weekday === wd)
        const theirs = withMe.filter((i) => i.weekday === wd)
        return (
          <section key={wd} className={`card agenda-day ${wd === today ? 'today' : ''}`}>
            <div className="row-between">
              <h2>{WEEKDAY_LONG[wd]} {wd === today && <span className="badge">hoje</span>}</h2>
              <button className="mini icon-text" onClick={() => setAdding(wd)} aria-label={`Adicionar em ${WEEKDAY_LONG[wd]}`}><Plus size={16} /></button>
            </div>
            {mine.length === 0 && theirs.length === 0 && <p className="muted small-text">Nada marcado</p>}
            <ul className="agenda-list">
              {mine.map((i) => (
                <li key={i.id}>
                  <AgendaLabel item={i} friendName={friendName} />
                  <button className="mini danger-text" onClick={() => remove(i)} aria-label="Remover"><Trash2 size={15} /></button>
                </li>
              ))}
              {theirs.map((i) => (
                <li key={`w${i.id}`} className="from-friend">
                  <span className="icon-text agenda-label"><Handshake size={16} />
                    <span><b>{i.owner_name}</b> marcou treino com você{i.muscle_groups?.length ? ` · ${i.muscle_groups.map((g) => GROUPS[g]).join(', ')}` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {adding !== null && (
        <AddSheet weekday={adding} routines={routines} friends={friends}
          onClose={() => setAdding(null)} onSaved={() => { setAdding(null); load() }} />
      )}
    </div>
  )
}

export function AgendaLabel({ item, friendName }) {
  if (item.kind === 'rest') return <span className="icon-text agenda-label"><Moon size={16} /> Descanso</span>
  if (item.kind === 'routine') {
    const d = item.routine_days
    return (
      <span className="icon-text agenda-label"><Dumbbell size={16} />
        <span>{d?.name ?? 'Treino removido'} <small className="muted">· {d?.routines?.name}</small></span>
      </span>
    )
  }
  return (
    <span className="icon-text agenda-label"><Handshake size={16} />
      <span>
        Com <b>{friendName(item.friend_id)}</b>
        <small className="muted"> · {item.muscle_groups?.length ? item.muscle_groups.map((g) => GROUPS[g]).join(', ') : 'IA decide'} · {item.place === 'casa' ? 'casa' : 'academia'} · {item.minutes} min</small>
      </span>
    </span>
  )
}

function AddSheet({ weekday, routines, friends, onClose, onSaved }) {
  const { toast } = useFeedback()
  const [kind, setKind] = useState('routine')
  const [routineId, setRoutineId] = useState(String(routines.find((r) => r.is_active)?.id ?? routines[0]?.id ?? ''))
  const routine = routines.find((r) => String(r.id) === routineId)
  const [dayId, setDayId] = useState('')
  const [friendId, setFriendId] = useState(friends[0]?.friend_id ?? '')
  const [groups, setGroups] = useState([])
  const [place, setPlace] = useState('academia')
  const [minutes, setMinutes] = useState('60')

  useEffect(() => { setDayId(String(routine?.routine_days?.[0]?.id ?? '')) }, [routineId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const row = { weekday, kind }
    if (kind === 'routine') {
      if (!dayId) return toast('Escolha um treino', 'error')
      row.routine_day_id = Number(dayId)
    }
    if (kind === 'friend') {
      if (!friendId) return toast('Escolha um amigo', 'error')
      Object.assign(row, { friend_id: friendId, muscle_groups: groups, place, minutes: Number(minutes) })
    }
    const { error } = await supabase.from('schedule_gymtrack').insert(row)
    if (error) return toast(`Erro: ${error.message}`, 'error')
    toast(`Adicionado em ${WEEKDAY_LONG[weekday]}`)
    onSaved()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <h2>{WEEKDAY_LONG[weekday]}</h2>
          <button className="mini" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="sheet-body">
          <div className="tabs">
            <button className={kind === 'routine' ? 'active' : ''} onClick={() => setKind('routine')}>Rotina</button>
            <button className={kind === 'friend' ? 'active' : ''} onClick={() => setKind('friend')}>Com amigo</button>
            <button className={kind === 'rest' ? 'active' : ''} onClick={() => setKind('rest')}>Descanso</button>
          </div>

          {kind === 'routine' && (routines.length === 0 ? (
            <p className="muted">Você ainda não tem rotinas. Crie uma em Rotinas.</p>
          ) : (
            <div className="filters filters-grid">
              <FilterSelect label="Rotina" value={routineId} onChange={setRoutineId} options={routines.map((r) => [String(r.id), r.name])} />
              <FilterSelect label="Treino" value={dayId} onChange={setDayId} options={(routine?.routine_days ?? []).map((d) => [String(d.id), d.name])} />
            </div>
          ))}

          {kind === 'friend' && (friends.length === 0 ? (
            <p className="muted">Adicione amigos na aba Amigos para marcar treinos juntos.</p>
          ) : (
            <>
              <FilterSelect label="Amigo" value={friendId} onChange={setFriendId} options={friends.map((f) => [f.friend_id, f.name])} />
              <div className="stack-tight">
                <span className="label-text">Músculos (opcional: sem marcar, a IA decide no dia)</span>
                <div className="weekdays">
                  {PICKABLE.map((g) => (
                    <button key={g} type="button" className={`chip ${groups.includes(g) ? 'on' : ''}`}
                      onClick={() => setGroups((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))}>{GROUPS[g]}</button>
                  ))}
                </div>
              </div>
              <div className="tabs">
                <button className={`icon-text ${place === 'academia' ? 'active' : ''}`} onClick={() => setPlace('academia')}><Dumbbell size={16} /> Academia</button>
                <button className={`icon-text ${place === 'casa' ? 'active' : ''}`} onClick={() => setPlace('casa')}><House size={16} /> Casa</button>
              </div>
              <FilterSelect label="Duração" value={minutes} onChange={setMinutes}
                options={[['30', '30 min'], ['45', '45 min'], ['60', '1 hora'], ['75', '1h15'], ['90', '1h30']]} />
            </>
          ))}

          {kind === 'rest' && <p className="muted">Dia de descanso: a tela Hoje mostra que é dia de recuperar.</p>}

          <button className="primary big" onClick={save}>Adicionar</button>
        </div>
      </div>
    </div>
  )
}