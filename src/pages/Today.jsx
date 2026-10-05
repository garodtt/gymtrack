import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveRoutine, getNextDay } from '../lib/data'

export default function Today() {
  const [routine, setRoutine] = useState(null)
  const [nextDay, setNextDay] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const r = await getActiveRoutine()
      setRoutine(r)
      if (r) setNextDay(await getNextDay(r))
      setLoading(false)
    })()
  }, [])

  if (loading) return <p className="muted">Carregando…</p>
  if (!routine)
    return (
      <div className="stack">
        <h1>Bem-vindo!</h1>
        <p>Você ainda não tem uma rotina ativa.</p>
        <Link className="button primary" to="/rotinas">Escolher ou gerar rotina</Link>
      </div>
    )

  return (
    <div className="stack">
      <p className="muted">{routine.name}</p>
      <h1>Hoje: {nextDay?.name}</h1>
      <ul className="list">
        {nextDay?.routine_exercises.map((re) => (
          <li key={re.id}>
            <span>{re.exercises.name}</span>
            <span className="muted">{re.sets} × {re.reps_min}–{re.reps_max}</span>
          </li>
        ))}
      </ul>
      <Link className="button primary big" to={`/treino/${nextDay.id}`}>Começar treino</Link>
      <details>
        <summary className="muted">Treinar outro dia</summary>
        <div className="stack">
          {routine.routine_days.map((d) => (
            <Link key={d.id} className="button" to={`/treino/${d.id}`}>{d.name}</Link>
          ))}
        </div>
      </details>
    </div>
  )
}
