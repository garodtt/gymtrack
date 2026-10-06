import { GROUPS } from '../lib/exercise'

// Atalhos de divisão de treino
export const PRESETS = [
  { key: 'ia', label: 'IA decide', groups: [] },
  { key: 'push', label: 'Empurrar', groups: ['peito', 'ombros', 'triceps'] },
  { key: 'pull', label: 'Puxar', groups: ['costas', 'biceps'] },
  { key: 'legs', label: 'Pernas', groups: ['pernas', 'gluteos', 'panturrilha'] },
  { key: 'upper', label: 'Superiores', groups: ['peito', 'costas', 'ombros', 'biceps', 'triceps'] },
  { key: 'full', label: 'Corpo inteiro', groups: ['peito', 'costas', 'ombros', 'pernas', 'gluteos', 'core'] },
]

const BLOCKS = [
  { label: 'Superiores', groups: ['peito', 'costas', 'ombros', 'biceps', 'triceps'] },
  { label: 'Inferiores', groups: ['pernas', 'gluteos', 'panturrilha'] },
  { label: 'Core e cardio', groups: ['core', 'cardio'] },
]

const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x))

// Escolha de grupos musculares: atalhos + músculos separados por região
export default function MusclePicker({ value = [], onChange, hint }) {
  const toggle = (g) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g])
  return (
    <div className="muscle-picker">
      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" className={`preset ${same(value, p.groups) ? 'on' : ''}`} onClick={() => onChange(p.groups)}>
            {p.label}
          </button>
        ))}
      </div>
      {BLOCKS.map((b) => (
        <div key={b.label} className="muscle-block">
          <small className="muted">{b.label}</small>
          <div className="weekdays">
            {b.groups.map((g) => (
              <button key={g} type="button" className={`chip ${value.includes(g) ? 'on' : ''}`} onClick={() => toggle(g)}>{GROUPS[g]}</button>
            ))}
          </div>
        </div>
      ))}
      {hint && <small className="muted">{hint}</small>}
    </div>
  )
}

export function DurationPicker({ value, onChange }) {
  const opts = [30, 45, 60, 75, 90]
  return (
    <div className="stack-tight">
      <span className="label-text">Duração de cada treino</span>
      <div className="segmented">
        {opts.map((m) => (
          <button key={m} type="button" className={Number(value) === m ? 'on' : ''} onClick={() => onChange(String(m))}>
            {m < 60 ? `${m} min` : m === 60 ? '1h' : `1h${m - 60}`}
          </button>
        ))}
      </div>
    </div>
  )
}