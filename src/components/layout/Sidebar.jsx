import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../lib/navConfig'
import { useAuth } from '../../hooks/useAuth.jsx'

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="dot" />
        <span>TARS</span>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/app'}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="avatar">{initials}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </span>
        </div>
        <button className="btn btn-ghost btn-sm btn-block" onClick={signOut}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
