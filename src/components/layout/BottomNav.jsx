import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from '../../lib/navConfig'
import Drawer from './Drawer.jsx'

export default function BottomNav({ onQuickAction }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const items = BOTTOM_NAV_ITEMS.map((key) => NAV_ITEMS.find((i) => i.key === key))

  return (
    <>
      <button className="fab" onClick={onQuickAction} aria-label="Registro rápido">
        +
      </button>
      <nav className="bottom-nav">
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button className="bottom-nav-item" onClick={() => setDrawerOpen(true)}>
          <span className="icon">☰</span>
          <span>Más</span>
        </button>
      </nav>
      {drawerOpen && (
        <Drawer
          onClose={() => setDrawerOpen(false)}
          onNavigate={(path) => {
            setDrawerOpen(false)
            navigate(path)
          }}
        />
      )}
    </>
  )
}
