import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLastSets } from '../lib/data'
import { suggestNext, fmt } from '../lib/progression'
import ExerciseGif from '../components/ExerciseGif'
import RestTimer from '../components/RestTimer'

export default function Workout() {
  const { dayId } = useParams()
  const navigate = useNavigate()
  const [day, setDay] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [rest, setRest] = useState({ key: 0, seconds: 90 })
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      const { data: d } = await supabase
        .from('routine_days')
        .select('*, routine_exercises(*, exercises(*))')
        .eq('id', dayId)
        .single()
      d.routine_exercises.sort((a, b) => a.position - b.position)
      setDay(d)

      // retoma uma sessão aberta de hoje para este dia, ou cria uma nova
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data: open } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('routine_day_id', dayId)
        .is('finished_at', null)
        .gte('started_at', today.toISOString())
        .limit(1)
      if (open?.length) return setSessionId(open[0].id)
      const { data: s } = await supabase
        .from('workout_sessions')
        .insert({ routine_day_id: Number(dayId) })
        .select()
        .single()
      setSessionId(s.id)
    })()
  }, [dayId])

  async function finish() {
    await supabase.from('workout_sessions').update({ finished_at: new Date().toISOString() }).eq('id', sessionId)
    navigate('/progresso')
  }

  if (!day || !sessionId) return <p className="muted">Preparando treino…</p>

  return (
    <div className="stack">
      <h1>{day.name}</h1>
      {day.routine_exercises.map((re) => (
        <ExerciseCard
          key={re.id}
          item={re}
          sessionId={sessionId}
          onSetDone={() => setRest({ key: Date.now(), seconds: re.rest_seconds })}
        />
      ))}
      <button className="primary big" onClick={finish}>Finalizar treino</button>
      <RestTimer seconds={rest.seconds} startKey={rest.key} />
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
      const sug = suggestNext(lastSets, item, ex.body_region)
      // já registrou algo nesta sessão? carrega
      const { data: current } = await supabase
        .from('set_logs')
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

  const suggestion = suggestNext(last, item, ex.body_region)

  async function toggle(idx) {
    const s = sets[idx]
    if (s.done) {
      await supabase.from('set_logs').delete()
        .eq('session_id', sessionId).eq('exercise_id', ex.id).eq('set_number', s.n)
    } else {
      if (s.reps === '') return
      await supabase.from('set_logs').upsert(
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
            {item.sets} séries × {item.reps_min}–{item.reps_max} {ex.name === 'Prancha' ? 's' : 'reps'} · descanso {item.rest_seconds}s
          </p>
        </div>
        <span className="muted">{showGif ? '▲' : '▶ vídeo'}</span>
      </header>
      {showGif && <ExerciseGif exercise={ex} />}
      {item.notes && <p className="note">{item.notes}</p>}
      <p className="hint">
        {last.length > 0 && <>Última: {fmt(last[0].weight_kg)} kg × {last.map((s) => s.reps).join(', ')}<br /></>}
        → {suggestion.text}
      </p>
      <table className="sets">
        <thead><tr><th>Série</th><th>kg</th><th>Reps</th><th></th></tr></thead>
        <tbody>
          {sets.map((s, i) => (
            <tr key={s.n} className={s.done ? 'done' : ''}>
              <td>{s.n}</td>
              <td><input inputMode="decimal" value={s.weight} disabled={s.done} onChange={(e) => update(i, 'weight', e.target.value.replace(',', '.'))} /></td>
              <td><input inputMode="numeric" value={s.reps} disabled={s.done} onChange={(e) => update(i, 'reps', e.target.value)} /></td>
              <td><button className={`check ${s.done ? 'on' : ''}`} onClick={() => toggle(i)} aria-label="Concluir série">✓</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
