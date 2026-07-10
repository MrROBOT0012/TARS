export function formatCordoba(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'C$ 0.00'
  return 'C$ ' + n.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatQq(value, decimals = 2) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0 qq'
  return n.toLocaleString('es-NI', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' qq'
}

export function formatNumber(value, decimals = 2) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('es-NI', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatPercent(value, decimals = 1) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0%'
  return n.toLocaleString('es-NI', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%'
}

export function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit' })
}

export function formatDateInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function todayInput() {
  return new Date().toISOString().slice(0, 10)
}
