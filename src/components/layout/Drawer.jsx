import { NAV_ITEMS, DRAWER_ITEMS } from '../../lib/navConfig'
import { useAuth } from '../../hooks/useAuth.jsx'

export default function Drawer({ onClose, onNavigate }) {
  const { signOut } = useAuth()
  const items = DRAWER_ITEMS.map((key) => NAV_ITEMS.find((i) => i.key === key))

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-handle" />
        <div className="drawer-grid">
          {items.map((item) => (
            <button key={item.key} className="drawer-item" onClick={() => onNavigate(item.path)}>
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 20 }} onClick={signOut}>
          Cerrar sesión
        </button>
      </div>
    </>
  )
}
