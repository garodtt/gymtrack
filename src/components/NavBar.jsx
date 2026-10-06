import { NavLink } from 'react-router-dom'
import { Dumbbell, ClipboardList, TrendingUp, BookOpen, Users } from 'lucide-react'

const links = [
  { to: '/', label: 'Hoje', Icon: Dumbbell },
  { to: '/rotinas', label: 'Rotinas', Icon: ClipboardList },
  { to: '/exercicios', label: 'Exercícios', Icon: BookOpen },
  { to: '/progresso', label: 'Progresso', Icon: TrendingUp },
  { to: '/amigos', label: 'Amigos', Icon: Users },
]

export default function NavBar() {
  return (
    <nav className="navbar">
      {links.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={22} strokeWidth={2} aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}