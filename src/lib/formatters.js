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

/**
 * Bare "YYYY-MM-DD" values (what every date column in this app stores) must
 * be parsed as a local calendar date, not a UTC instant — `new Date(value)`
 * treats them as UTC midnight, which renders as the previous day in any
 * timezone behind UTC (all of the Americas, including Nicaragua).
 */
function parseCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  if (match) {
    const [, y, m, d] = match
    return new Date(Number(y), Number(m) - 1, Number(d))
  }
  return new Date(value)
}

export function formatDate(value) {
  if (!value) return ''
  const d = parseCalendarDate(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(value) {
  if (!value) return ''
  const d = parseCalendarDate(value)
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
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
