import { Zap, TrendingUp, PartyPopper, Flame } from 'lucide-react'
import { BADGES, levelName } from '../lib/gamification'

// Tela de comemoração ao finalizar o treino
export default function Celebration({ before, after, onClose }) {
  const gained = Math.max(0, (after?.total_xp ?? 0) - (before?.total_xp ?? 0))
  const levelUp = before && after && after.level > before.level
  const prs = after?.last_session?.prs ?? 0
  const badges = (after?.new_badges ?? []).filter((b) => BADGES[b])
  const weekDone = after && after.week_workouts >= after.week_target && (before?.week_workouts ?? 0) < after.week_target

  return (
    <div className="dialog-backdrop celebrate">
      <div className="dialog celebration">
        <span className="burst"><PartyPopper size={36} /></span>
        <h2>Treino concluído!</h2>
        <p className="xp-gain"><Zap size={26} /> +{gained} XP</p>

        <ul className="celebrate-list">
          {prs > 0 && <li><TrendingUp size={18} /> {prs} {prs > 1 ? 'recordes pessoais' : 'recorde pessoal'}!</li>}
          {levelUp && <li><span className="level-badge sm">{after.level}</span> Subiu para <b>{levelName(after.level)}</b></li>}
          {weekDone && <li><Flame size={18} /> Meta da semana batida!</li>}
          {badges.map((b) => {
            const { Icon, name } = BADGES[b]
            return <li key={b} className="new-badge"><Icon size={18} /> Emblema: <b>{name}</b></li>
          })}
        </ul>

        <button className="primary big" onClick={onClose}>Continuar</button>
      </div>
    </div>
  )
}