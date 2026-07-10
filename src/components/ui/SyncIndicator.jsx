import { useOnlineStatus } from '../../hooks/useData'

export default function SyncIndicator() {
  const online = useOnlineStatus()
  return (
    <span className={'sync-indicator' + (online ? ' online' : '')}>
      <span className="dot" />
      {online ? 'En línea' : 'Sin conexión'}
    </span>
  )
}
