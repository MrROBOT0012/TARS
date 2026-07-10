const STATUS_MAP = {
  en_proceso: { label: 'En proceso', tone: 'amber' },
  preseco: { label: 'Preseco', tone: 'blue' },
  seco: { label: 'Seco', tone: 'green' },
  completado: { label: 'Completado', tone: 'green' },
  parcial: { label: 'Parcial', tone: 'amber' },
  activo: { label: 'Activo', tone: 'green' },
  cerrado: { label: 'Cerrado', tone: 'gray' },
  propio: { label: 'Propio', tone: 'teal' },
  comprado: { label: 'Comprado', tone: 'blue' }
}

export default function StatusChip({ status }) {
  const info = STATUS_MAP[status] ?? { label: status, tone: 'gray' }
  return <span className={`chip chip-${info.tone}`}>{info.label}</span>
}
