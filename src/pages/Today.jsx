import { useEffect, useState } from 'react'
import { Moon, Play, Pencil, CalendarDays, Handshake, Sparkles, Dumbbell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getActiveRoutine, getNextDay, getTodayPlan, WEEKDAYS } from '../lib/data'
import { unitShort, GROUPS } from '../lib/exercise'
import { loadMyAgenda, loadAgendaWithMe, jointToday, jointLink, WEEKDAY_LONG } from '../lib/agenda'
import LevelCard from '../components/LevelCard'

export default function Today({ session }) {
  const myId = session.user.id
  const [routine, setRoutine] = useState(null)
  const [plan, setPlan] = useState(null)
  const [agenda, setAgenda] = useState(null) // { hasAgenda, today: [...] }
  const [loading, setLoading] = useState(true)
  const weekday = new Date().getDay()

  useEffect(() => {
    ;(async () => {
      const [r, mine, withMe] = await Promise.all([getActiveRoutine(), loadMyAgenda(), loadAgendaWithMe()])
      setRoutine(r)
      if (r) setPlan(await getTodayPlan(r))

      // itens de hoje: os meus + os que amigos marcaram comigo
      const todayItems = [
        ...mine.filter((i) => i.weekday === weekday).map((i) => ({ ...i, source: 'mine' })),
        ...withMe
          // se eu também marquei com essa pessoa hoje, mostra só uma vez
          .filter((i) => i.weekday === weekday && !mine.some((m) => m.weekday === weekday && m.kind === 'friend' && m.friend_id === i.owner_id))
          .map((i) => ({
          ...i, kind: 'friend', source: 'friend', friend_id: i.owner_id, friend_name: i.owner_name,
        })),
      ]
      // carrega detalhes: exercícios do treino da rotina e treino em dupla já montado
      const { data: friends } = await supabase.rpc('friends_list_gymtrack')
      const enriched = await Promise.all(todayItems.map(async (i) => {
        if (i.kind === 'routine' && i.routine_day_id) {
          const { data: d } = await supabase.from('routine_days_gymtrack')
            .select('id, name, routine_exercises:routine_exercises_gymtrack(id, position, sets, reps_min, reps_max, exercises:exercises_gymtrack(name, unit))')
            .eq('id', i.routine_day_id).maybeSingle()
          d?.routine_exercises.sort((a, b) => a.position - b.position)
          return { ...i, day: d }
        }
        if (i.kind === 'friend') {
          const name = i.friend_name ?? friends?.find((f) => f.friend_id === i.friend_id)?.name ?? 'amigo'
          return { ...i, friend_name: name, joint: await jointToday(i.friend_id, myId) }
        }
        return i
      }))
      setAgenda({ hasAgenda: mine.length > 0, today: enriched })
      setLoading(false)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function trainAnyway() {
    setPlan({ day: await getNextDay(routine), restDay: false, scheduled: true })
    setAgenda((a) => ({ ...a, hasAgenda: false, today: [] }))
  }

  if (loading) return <p className="muted">Carregando…</p>
  const useAgenda = agenda.hasAgenda || agenda.today.length > 0

  if (!routine && !useAgenda)
    return (
      <div className="stack">
        <h1>Bem-vindo!</h1>
        <p>Você ainda não tem uma rotina ativa.</p>
        <Link className="button primary" to="/rotinas">Escolher ou gerar rotina</Link>
        <Link className="button icon-text" to="/agenda"><CalendarDays size={18} /> Montar minha agenda</Link>
      </div>
    )

  const weekdayLabel = (d) => (d.weekdays?.length ? d.weekdays.map((w) => WEEKDAYS[w]).join(', ') : null)

  return (
    <div className="stack">
      <LevelCard compact />

      {useAgenda ? (
        <>
          <div className="row-between">
            <p className="muted">{WEEKDAY_LONG[weekday]} · sua agenda</p>
            <Link className="muted small-text icon-text" to="/agenda"><CalendarDays size={14} /> editar</Link>
          </div>
          {agenda.today.length === 0 && (
            <>
              <h1 className="icon-text"><Moon size={26} /> Nada na agenda hoje</h1>
              {routine && <button className="big" onClick={trainAnyway}>Treinar mesmo assim</button>}
            </>
          )}
          {agenda.today.map((i, idx) => <AgendaCard key={`${i.source}${i.id}`} item={i} first={idx === 0} />)}
        </>
      ) : plan?.restDay ? (
        <>
          <p className="muted">{routine.name}</p>
          <h1 className="icon-text"><Moon size={26} /> Hoje é dia de descanso</h1>
          {plan.next && <p className="muted">Próximo treino: <b>{plan.next.name}</b> ({WEEKDAYS[plan.nextWeekday]})</p>}
          <button className="big" onClick={trainAnyway}>Treinar mesmo assim</button>
        </>
      ) : plan?.day ? (
        <>
          <p className="muted">{routine.name}</p>
          <DayCard day={plan.day} />
        </>
      ) : (
        <p className="muted">Essa rotina ainda não tem treinos.</p>
      )}

      {routine && (
        <details>
          <summary className="muted">Treinar outro dia</summary>
          <div className="stack">
            {routine.routine_days.map((d) => (
              <Link key={d.id} className="button row-between" to={`/treino/${d.id}`}>
                <span>{d.name}</span>
                {weekdayLabel(d) && <span className="muted">{weekdayLabel(d)}</span>}
              </Link>
            ))}
          </div>
        </details>
      )}
      <div className="row-center-gap">
        <Link className="muted center-link icon-text" to="/agenda"><CalendarDays size={15} /> Agenda da semana</Link>
        {routine && <Link className="muted center-link icon-text" to={`/rotinas/${routine.id}/editar`}><Pencil size={15} /> Editar rotina</Link>}
      </div>
    </div>
  )
}

function DayCard({ day, title = true }) {
  return (
    <>
      {title && <h1>Hoje: {day.name}</h1>}
      <ul className="list">
        {day.routine_exercises.map((re) => (
          <li key={re.id}>
            <span>{re.exercises?.name}</span>
            <span className="muted">{re.sets} × {re.reps_min}–{re.reps_max} {unitShort(re.exercises)}</span>
          </li>
        ))}
      </ul>
      <Link className="button primary big icon-text" to={`/treino/${day.id}`}><Play size={20} fill="currentColor" /> Começar treino</Link>
    </>
  )
}

function AgendaCard({ item }) {
  if (item.kind === 'rest') {
    return <section className="card"><h2 className="icon-text"><Moon size={20} /> Descanso</h2><p className="muted small-text">Recuperar também faz parte do treino.</p></section>
  }
  if (item.kind === 'routine') {
    if (!item.day) return null
    return (
      <section className="card stack-tight">
        <h2 className="icon-text"><Dumbbell size={20} /> {item.day.name}</h2>
        <small className="muted">{item.routine_days?.routines?.name}</small>
        <DayCard day={item.day} title={false} />
      </section>
    )
  }
  // treino com amigo
  const groups = item.muscle_groups?.length ? item.muscle_groups.map((g) => GROUPS[g]).join(', ') : 'a IA escolhe os músculos'
  return (
    <section className="card stack-tight duo-today">
      <h2 className="icon-text"><Handshake size={20} /> Treino com {item.friend_name}</h2>
      <small className="muted">
        {item.source === 'friend' ? `${item.friend_name} marcou com você · ` : ''}{groups} · {item.place === 'casa' ? 'em casa' : 'academia'} · {item.minutes} min
      </small>
      {item.joint ? (
        <>
          <Link className="button primary big icon-text" to={`/junto/${item.joint.id}`}><Play size={20} fill="currentColor" /> Começar: {item.joint.title}</Link>
          <Link className="muted small-text center-link" to={jointLink({ friendId: item.friend_id, groups: item.muscle_groups ?? [], place: item.place, minutes: item.minutes })}>montar outro treino para hoje</Link>
        </>
      ) : (
        <Link className="button primary big icon-text"
          to={jointLink({ friendId: item.friend_id, groups: item.muscle_groups ?? [], place: item.place, minutes: item.minutes })}>
          <Sparkles size={18} /> Montar o treino da dupla
        </Link>
      )}
    </section>
  )
}