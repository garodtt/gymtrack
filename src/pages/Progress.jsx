import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import { fmt } from '../lib/progression'
import LevelCard from '../components/LevelCard'
import BadgeGrid from '../components/BadgeGrid'
import { BADGES } from '../lib/gamification'

const BADGE_COUNT = Object.keys(BADGES).length

export default function Progress() {
  const [logs, setLogs] = useState([])
  const [sessions, setSessions] = useState([])
  const [exerciseId, setExerciseId] = useState('')
  const [badges, setBadges] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data: l } = await supabase
        .from('set_logs_gymtrack')
        .select('exercise_id, weight_kg, reps, created_at, session_id, exercises:exercises_gymtrack(name)')
        .order('created_at')
      setLogs(l ?? [])
      const { data: s } = await supabase
        .from('workout_sessions_gymtrack')
        .select('id, started_at, finished_at, routine_days:routine_days_gymtrack(name)')
        .order('started_at', { ascending: false })
        .limit(30)
      setSessions(s ?? [])
    })()
  }, [])

  const exercises = useMemo(() => {
    const map = new Map()
    logs.forEach((l) => map.set(l.exercise_id, l.exercises?.name))
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [logs])

  useEffect(() => {
    if (!exerciseId && exercises.length) setExerciseId(String(exercises[0][0]))
  }, [exercises, exerciseId])

  // 1 ponto por sessão: maior carga usada e 1RM estimado (Epley)
  const chart = useMemo(() => {
    const bySession = new Map()
    logs.filter((l) => String(l.exercise_id) === exerciseId).forEach((l) => {
      const w = Number(l.weight_kg)
      const e1rm = w * (1 + l.reps / 30)
      const cur = bySession.get(l.session_id) ?? { date: l.created_at, carga: 0, e1rm: 0 }
      bySession.set(l.session_id, { date: cur.date, carga: Math.max(cur.carga, w), e1rm: Math.max(cur.e1rm, Math.round(e1rm * 10) / 10) })
    })
    return [...bySession.values()].map((p) => ({ ...p, dia: new Date(p.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }))
  }, [logs, exerciseId])

  const first = chart[0]?.carga, lastW = chart.at(-1)?.carga

  return (
    <div className="stack">
      <h1>Progresso</h1>
      <LevelCard onLoaded={(g) => setBadges(g?.badges ?? [])} />
      {exercises.length === 0 ? (
        <p className="muted">Registre seu primeiro treino para ver a evolução.</p>
      ) : (
        <section className="card">
          <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            {exercises.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          {chart.length > 1 && (
            <p className="hint">{fmt(first)} kg → {fmt(lastW)} kg ({lastW - first >= 0 ? '+' : ''}{fmt(lastW - first)} kg em {chart.length} sessões)</p>
          )}
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="dia" stroke="var(--muted)" fontSize={12} />
                <YAxis stroke="var(--muted)" fontSize={12} unit="kg" />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)' }} />
                <Line type="monotone" dataKey="carga" name="Carga máx." stroke="var(--accent)" strokeWidth={2} dot />
                <Line type="monotone" dataKey="e1rm" name="1RM estimado" stroke="var(--muted)" strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {badges && (
        <section className="stack-tight">
          <h2>Emblemas <span className="muted">· {badges.length}/{BADGE_COUNT}</span></h2>
          <BadgeGrid earned={badges} />
        </section>
      )}

      <h2>Últimos treinos</h2>
      <p className="muted small-text">Toque em um treino para editar cargas, repetições, data ou excluir.</p>
      <ul className="list">
        {sessions.map((s) => {
          const mins = s.finished_at ? Math.round((new Date(s.finished_at) - new Date(s.started_at)) / 60000) : null
          return (
            <li key={s.id}>
              <Link to={`/sessao/${s.id}`} className="row-link">
                <span>{s.routine_days?.name ?? 'Treino'}</span>
                <span className="muted">
                  {new Date(s.started_at).toLocaleDateString('pt-BR')} · {mins !== null ? `${mins} min` : 'não finalizado'} <ChevronRight size={16} className="chev" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}