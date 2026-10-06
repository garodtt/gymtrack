import { useEffect, useRef, useState } from 'react'
import { Check, ChevronUp, CirclePlay, Lightbulb } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLastSets } from '../lib/data'
import { suggestNext, fmt } from '../lib/progression'
import { unitShort, unitHeader } from '../lib/exercise'
import ExerciseGif from '../components/ExerciseGif'
import RestTimer from '../components/RestTimer'
import { useFeedback } from '../components/Feedback'
import { useWakeLock } from '../lib/useWakeLock'
import { fetchGamification } from '../lib/gamification'
import Celebration from '../components/Celebration'

export default function Workout({ session }) {
  const { dayId, jointId } = useParams() // treino da rotina (/treino/:dayId) ou em dupla (/junto/:jointId)
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const [day, setDay] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [rest, setRest] = useState({ key: 0, seconds: 90 })
  const started = useRef(false)
  useWakeLock() // tela não apaga durante o treino
  const [before, setBefore] = useState(null)   // XP antes do treino (para a comemoração)
  const [after, setAfter] = useState(null)
  const [finishing, setFinishing] = useState(false)
  useEffect(() => { fetchGamification().then(setBefore).catch(() => {}) }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      // monta o "dia" a partir da rotina ou do treino em dupla
      let d
      if (jointId) {
        d = await loadJointDay(jointId, session.user.id)
        if (!d) { toast('Treino em dupla não encontrado', 'error'); return navigate('/amigos') }
      } else {
        const res = await supabase
          .from('routine_days_gymtrack')
          .select('*, routine_exercises:routine_exercises_gymtrack(*, exercises:exercises_gymtrack(*))')
          .eq('id', dayId)
          .single()
        d = res.data
        d.routine_exercises.sort((a, b) => a.position - b.position)
      }
      setDay(d)

      // retoma uma sessão aberta de hoje para este treino, ou cria uma nova
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      let q = supabase
        .from('workout_sessions_gymtrack')
        .select('id')
        .is('finished_at', null)
        .gte('started_at', today.toISOString())
        .limit(1)
      q = jointId ? q.eq('joint_workout_id', jointId) : q.eq('routine_day_id', dayId)
      const { data: open } = await q
      if (open?.length) return setSessionId(open[0].id)
      const { data: s } = await supabase
        .from('workout_sessions_gymtrack')
        .insert(jointId ? { joint_workout_id: Number(jointId) } : { routine_day_id: Number(dayId) })
        .select()
        .single()
      setSessionId(s.id)
    })()
  }, [dayId, jointId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function finish() {
    setFinishing(true)
    await supabase.from('workout_sessions_gymtrack').update({ finished_at: new Date().toISOString() }).eq('id', sessionId)
    try {
      setAfter(await fetchGamification())
    } catch {
      toast('Treino finalizado. Bom trabalho!')
      navigate('/progresso')
    }
  }

  if (!day || !sessionId) return <p className="muted">Preparando treino…</p>

  return (
    <div className="stack">
      <h1>{day.name}</h1>
      {day.subtitle && <p className="muted">{day.subtitle}</p>}
      {day.routine_exercises.map((re) => (
        <ExerciseCard
          key={re.id}
          item={re}
          sessionId={sessionId}
          onSetDone={() => setRest({ key: Date.now(), seconds: re.rest_seconds })}
        />
      ))}
      <button className="primary big" onClick={finish} disabled={finishing}>{finishing ? 'Finalizando…' : 'Finalizar treino'}</button>
      <RestTimer seconds={rest.seconds} startKey={rest.key} />
      {after && <Celebration before={before} after={after} onClose={() => navigate('/progresso')} />}
    </div>
  )
}

function ExerciseCard({ item, sessionId, onSetDone }) {
  const ex = item.exercises
  const [last, setLast] = useState([])
  const [sets, setSets] = useState(() =>
    Array.from({ length: item.sets }, (_, i) => ({ n: i + 1, weight: '', reps: '', done: false })),
  )
  const [showGif, setShowGif] = useState(false)

  useEffect(() => {
    ;(async () => {
      const lastSets = await getLastSets(ex.id, sessionId)
      setLast(lastSets)
      const sug = suggestNext(lastSets, item, ex.body_region, ex.unit)
      // já registrou algo nesta sessão? carrega
      const { data: current } = await supabase
        .from('set_logs_gymtrack')
        .select('set_number, weight_kg, reps')
        .eq('session_id', sessionId)
        .eq('exercise_id', ex.id)
      setSets((prev) =>
        prev.map((s) => {
          const c = current?.find((x) => x.set_number === s.n)
          if (c) return { ...s, weight: c.weight_kg, reps: c.reps, done: true }
          return { ...s, weight: sug.weight ?? '', reps: sug.reps ?? '' }
        }),
      )
    })()
  }, [ex.id, sessionId, item])

  const suggestion = suggestNext(last, item, ex.body_region, ex.unit)

  async function toggle(idx) {
    const s = sets[idx]
    if (s.done) {
      await supabase.from('set_logs_gymtrack').delete()
        .eq('session_id', sessionId).eq('exercise_id', ex.id).eq('set_number', s.n)
    } else {
      if (s.reps === '') return
      await supabase.from('set_logs_gymtrack').upsert(
        { session_id: sessionId, exercise_id: ex.id, set_number: s.n, weight_kg: Number(s.weight) || 0, reps: Number(s.reps) },
        { onConflict: 'session_id,exercise_id,set_number' },
      )
      onSetDone()
    }
    setSets((prev) => prev.map((x, i) => (i === idx ? { ...x, done: !x.done } : x)))
  }

  const update = (idx, field, value) =>
    setSets((prev) => prev.map((x, i) => (i === idx ? { ...x, [field]: value } : x)))

  return (
    <section className="card">
      <header className="card-head" onClick={() => setShowGif((v) => !v)}>
        <div>
          <h2>{ex.name}</h2>
          <p className="muted">
            {item.sets} séries × {item.reps_min}–{item.reps_max} {unitShort(ex)} · descanso {item.rest_seconds}s
          </p>
        </div>
        <span className="muted">{showGif ? <ChevronUp size={20} /> : <span className="icon-text"><CirclePlay size={18} /> vídeo</span>}</span>
      </header>
      {showGif && <ExerciseGif exercise={ex} />}
      {item.notes && <p className="note">{item.notes}</p>}
      <p className="hint">
        {last.length > 0 && <>Última: {Number(last[0].weight_kg) > 0 ? `${fmt(last[0].weight_kg)} kg × ` : ''}{last.map((s) => s.reps).join(', ')} {unitShort(ex)}<br /></>}
        <span className="icon-text"><Lightbulb size={15} /> {suggestion.text}</span>
      </p>
      <table className="sets">
        <thead><tr><th>Série</th><th>kg</th><th>{unitHeader(ex)}</th><th></th></tr></thead>
        <tbody>
          {sets.map((s, i) => (
            <tr key={s.n} className={s.done ? 'done' : ''}>
              <td>{s.n}</td>
              <td><input inputMode="decimal" value={s.weight} disabled={s.done} onChange={(e) => update(i, 'weight', e.target.value.replace(',', '.'))} /></td>
              <td><input inputMode="numeric" value={s.reps} disabled={s.done} onChange={(e) => update(i, 'reps', e.target.value)} /></td>
              <td><button className={`check ${s.done ? 'on' : ''}`} onClick={() => toggle(i)} aria-label="Concluir série"><Check size={20} strokeWidth={2.5} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

// Converte um treino em dupla no formato de "dia" usado pela tela de treino,
// com as séries/reps da pessoa logada (criador ou parceiro).
async function loadJointDay(jointId, userId) {
  const { data: j } = await supabase.from('joint_workouts_gymtrack').select('*').eq('id', jointId).maybeSingle()
  if (!j) return null
  const role = j.creator_id === userId ? 'creator' : 'partner'
  const ids = j.plan.exercises.map((e) => e.exercise_id)
  const { data: exs } = await supabase.from('exercises_gymtrack').select('*').in('id', ids)
  const { data: people } = await supabase.rpc('joint_people_gymtrack', { p_joint: Number(jointId) })
  const other = role === 'creator' ? people?.[0]?.partner_name : people?.[0]?.creator_name
  return {
    name: j.title,
    subtitle: other ? `Treino em dupla com ${other}` : 'Treino em dupla',
    routine_exercises: j.plan.exercises
      .map((e, i) => ({
        id: `j${i}`,
        position: i + 1,
        exercise_id: e.exercise_id,
        sets: e[role].sets,
        reps_min: e[role].reps_min,
        reps_max: e[role].reps_max,
        rest_seconds: e.rest_seconds,
        notes: e.notes,
        exercises: exs?.find((x) => x.id === e.exercise_id),
      }))
      .filter((e) => e.exercises),
  }
}