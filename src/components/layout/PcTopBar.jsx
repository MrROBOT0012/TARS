import CycleSelector from './CycleSelector.jsx'
import SyncIndicator from '../ui/SyncIndicator.jsx'

export default function PcTopBar({ title }) {
  return (
    <header className="pc-topbar">
      <h1 style={{ fontSize: 20 }}>{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SyncIndicator />
        <CycleSelector />
      </div>
    </header>
  )
}
