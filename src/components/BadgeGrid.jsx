import { Lock } from 'lucide-react'
import { BADGES } from '../lib/gamification'

export default function BadgeGrid({ earned = [] }) {
  const got = new Map(earned.map((b) => [b.badge, b.earned_at]))
  return (
    <div className="badge-grid">
      {Object.entries(BADGES).map(([key, b]) => {
        const at = got.get(key)
        const Icon = at ? b.Icon : Lock
        return (
          <div key={key} className={`badge-item ${at ? 'on' : ''}`} title={b.desc}>
            <span className="badge-icon"><Icon size={22} /></span>
            <b>{b.name}</b>
            <small className="muted">{at ? new Date(at).toLocaleDateString('pt-BR') : b.desc}</small>
          </div>
        )
      })}
    </div>
  )
}