import { parseCalendarDate, formatDate } from './formatters'

/**
 * True when `fecha` falls outside the ciclo's inicio/fin bounds. A ciclo
 * with no inicio or no fin is treated as unbounded on that side (records
 * can't be flagged against a boundary that was never set).
 */
export function fechaFueraDeCiclo(fecha, ciclo) {
  if (!fecha || !ciclo) return false
  const f = parseCalendarDate(fecha)
  if (Number.isNaN(f.getTime())) return false
  if (ciclo.inicio) {
    const inicio = parseCalendarDate(ciclo.inicio)
    if (!Number.isNaN(inicio.getTime()) && f < inicio) return true
  }
  if (ciclo.fin) {
    const fin = parseCalendarDate(ciclo.fin)
    if (!Number.isNaN(fin.getTime()) && f > fin) return true
  }
  return false
}

export function rangoCicloTexto(ciclo) {
  if (!ciclo) return ''
  const inicio = ciclo.inicio ? formatDate(ciclo.inicio) : null
  const fin = ciclo.fin ? formatDate(ciclo.fin) : null
  if (inicio && fin) return `${inicio} – ${fin}`
  if (inicio) return `desde ${inicio}`
  if (fin) return `hasta ${fin}`
  return 'sin rango definido'
}

/**
 * Data-entry gate: if `fecha` is outside the ciclo's bounds, blocks on a
 * native confirm() dialog (same pattern already used for delete
 * confirmations) so the user can't miss the warning, but still lets them
 * proceed on purpose. Returns true when the save should continue.
 */
export function confirmarFechaFueraDeCiclo(fecha, ciclo) {
  if (!fechaFueraDeCiclo(fecha, ciclo)) return true
  return confirm(
    `⚠️ La fecha (${formatDate(fecha)}) está fuera del rango del ciclo "${ciclo.nombre}" (${rangoCicloTexto(ciclo)}).\n\n¿Guardar de todas formas?`
  )
}
