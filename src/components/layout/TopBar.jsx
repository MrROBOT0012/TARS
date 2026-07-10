import CycleSelector from './CycleSelector.jsx'
import SyncIndicator from '../ui/SyncIndicator.jsx'

export default function TopBar() {
  return (
    <header className="mobile-topbar">
      <span className="brand">TARS</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SyncIndicator />
        <CycleSelector />
      </div>
    </header>
  )
}
