import { useEffect, useState } from 'react'
import { Flame, Zap } from 'lucide-react'
import { fetchGamification, levelName, levelProgress, BADGES } from '../lib/gamification'
import { useFeedback } from './Feedback'
import { fmt } from '../lib/progression'

// Cartão de nível: XP, barra, sequência e meta da semana.
// compact = versão curta para a tela Hoje
export default function LevelCard({ compact = false, onLoaded }) {
  const { toast } = useFeedback()
  const [g, setG] = useState(null)

  useEffect(() => {
    fetchGamification()
      .then((data) => {
        setG(data); onLoaded?.(data)
        // emblemas ganhos fora de um treino (ex.: adicionou um amigo)
        ;(data?.new_badges ?? []).forEach((b) => BADGES[b] && toast(`Novo emblema: ${BADGES[b].name}`))
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!g) return compact ? null : <div className="card skeleton" style={{ height: 120 }} />

  const pct = Math.round(levelProgress(g) * 100)
  const weekPct = Math.min(100, Math.round((g.week_workouts / g.week_target) * 100))

  return (
    <section className={`card level-card ${compact ? 'compact' : ''}`}>
      <div className="row-between">
        <div className="level-title">
          <span className="level-badge">{g.level}</span>
          <div>
            <b>{levelName(g.level)}</b>
            <small className="muted block">{fmt(g.total_xp)} XP{g.level_next ? ` · faltam ${fmt(g.level_next - g.total_xp)} para ${levelName(g.level + 1)}` : ' · nível máximo'}</small>
          </div>
        </div>
        <div className={`streak ${g.streak_weeks > 0 ? 'on' : ''}`} title="Semanas seguidas batendo a meta">
          <Flame size={20} />
          <b>{g.streak_weeks}</b>
        </div>
      </div>
      <div className="bar"><span style={{ width: `${pct}%` }} /></div>
      {!compact && (
        <div className="level-stats">
          <div>
            <small className="muted">Meta da semana</small>
            <b>{g.week_workouts}/{g.week_target} treinos</b>
            <div className="bar thin"><span style={{ width: `${weekPct}%` }} /></div>
          </div>
          <div>
            <small className="muted">XP na semana</small>
            <b className="icon-text"><Zap size={15} /> {fmt(g.week_xp)}</b>
          </div>
          <div>
            <small className="muted">Recordes</small>
            <b>{g.total_prs}</b>
          </div>
        </div>
      )}
      {compact && (
        <small className="muted">
          Semana: {g.week_workouts}/{g.week_target} treinos · {g.streak_weeks > 0 ? `${g.streak_weeks} semana${g.streak_weeks > 1 ? 's' : ''} seguida${g.streak_weeks > 1 ? 's' : ''}` : 'comece sua sequência!'}
        </small>
      )}
    </section>
  )
}