import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Hoje', icon: '🏋️' },
  { to: '/rotinas', label: 'Rotinas', icon: '📋' },
  { to: '/progresso', label: 'Progresso', icon: '📈' },
]

export default function NavBar() {
  return (
    <nav className="navbar">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span aria-hidden>{l.icon}</span>
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
