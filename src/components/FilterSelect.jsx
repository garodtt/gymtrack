import { ChevronDown } from 'lucide-react'

// Campo de filtro compacto (abre a lista nativa do celular)
export default function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className={`filter-select ${value && value !== 'todos' ? 'active' : ''}`}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <ChevronDown size={16} aria-hidden />
    </label>
  )
}