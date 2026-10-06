import { useMemo, useState } from 'react'
import { X, House } from 'lucide-react'
import { GROUPS, isHome } from '../lib/exercise'


// Lista de exercícios do catálogo. Ao trocar, abre filtrado pelo mesmo grupo muscular.
export default function ExercisePicker({ catalog, muscle, exclude, title, homeDefault = false, onPick, onClose }) {
  const [group, setGroup] = useState(muscle ?? 'todos')
  const [homeOnly, setHomeOnly] = useState(homeDefault)
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return catalog
      .filter((e) => e.id !== exclude)
      .filter((e) => group === 'todos' || e.muscle_group === group)
      .filter((e) => !homeOnly || isHome(e))
      .filter((e) => !term || e.name.toLowerCase().includes(term))
  }, [catalog, group, q, exclude, homeOnly])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <h2>{title}</h2>
          <button className="mini" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        {muscle && <p className="muted small-text">Mostrando exercícios de {GROUPS[muscle] ?? muscle}, que trabalham o mesmo músculo.</p>}
        <input placeholder="Buscar pelo nome" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips-scroll">
          <button className={`chip icon-text ${homeOnly ? 'on' : ''}`} onClick={() => setHomeOnly((v) => !v)}><House size={14} /> Casa</button>
          <span className="chip-sep" />
          <button className={`chip ${group === 'todos' ? 'on' : ''}`} onClick={() => setGroup('todos')}>Todos</button>
          {Object.entries(GROUPS).map(([k, label]) => (
            <button key={k} className={`chip ${group === k ? 'on' : ''}`} onClick={() => setGroup(k)}>{label}</button>
          ))}
        </div>
        <ul className="pick-list">
          {list.map((e) => (
            <li key={e.id}>
              <button onClick={() => onPick(e)}>
                {e.gif_url ? <img src={e.gif_url} alt="" loading="lazy" /> : <span className="thumb-empty" />}
                <span>
                  {e.name}
                  <small className="muted">{GROUPS[e.muscle_group] ?? e.muscle_group}{e.equipment ? ` · ${e.equipment}` : ''}</small>
                </span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="muted">Nenhum exercício encontrado.</li>}
        </ul>
      </div>
    </div>
  )
}