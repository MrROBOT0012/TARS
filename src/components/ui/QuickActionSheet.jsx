import BottomSheet from '../layout/BottomSheet.jsx'

const QUICK_ACTIONS = [
  { key: 'bascula', label: 'Nuevo viaje (báscula)', icon: '⚖️', path: '/bascula?new=1' },
  { key: 'secado', label: 'Registrar secado', icon: '☀️', path: '/proceso?tab=secado&new=1' },
  { key: 'embodegado', label: 'Registrar embodegado', icon: '📦', path: '/proceso?tab=embodegado&new=1' },
  { key: 'turno', label: 'Nuevo turno de trillo', icon: '🏭', path: '/proceso?tab=turnos&new=1' },
  { key: 'venta', label: 'Registrar venta', icon: '💰', path: '/ventas?new=1' },
  { key: 'gasto', label: 'Registrar gasto de campo', icon: '🧑‍🌾', path: '/campo?new=1' }
]

export default function QuickActionSheet({ onClose, onNavigate }) {
  return (
    <BottomSheet title="Registro rápido" onClose={onClose}>
      <div className="drawer-grid">
        {QUICK_ACTIONS.map((action) => (
          <button key={action.key} className="drawer-item" onClick={() => onNavigate(action.path)}>
            <span className="icon">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
