export const HUMEDAD_OBJETIVO_ESTANDAR = 12.5

/**
 * qq_seco = qq_neto * (100 - humedad_entrada) / (100 - humedad_objetivo)
 */
export function calcularQqSeco(qqNeto, humedadEntrada, humedadObjetivo = HUMEDAD_OBJETIVO_ESTANDAR) {
  if (qqNeto == null || humedadEntrada == null) return null
  const denom = 100 - humedadObjetivo
  if (denom <= 0) return null
  const qq = (Number(qqNeto) * (100 - Number(humedadEntrada))) / denom
  return Number.isFinite(qq) ? qq : null
}

export function calcularMerma(qqNeto, qqSeco) {
  if (qqNeto == null || qqSeco == null) return null
  return Number(qqNeto) - Number(qqSeco)
}

export function calcularMermaPorcentaje(qqNeto, qqSeco) {
  if (!qqNeto) return null
  const merma = calcularMerma(qqNeto, qqSeco)
  if (merma == null) return null
  return (merma / Number(qqNeto)) * 100
}

export function calcularCostoPorQq(totalCostos, totalQq) {
  if (!totalQq) return null
  return Number(totalCostos) / Number(totalQq)
}

export function calcularMargenPorQq(precioVentaPromedio, costoPorQqSeco) {
  if (precioVentaPromedio == null || costoPorQqSeco == null) return null
  return Number(precioVentaPromedio) - Number(costoPorQqSeco)
}

export function calcularRendimientoAE(qqArrozEntero, qqSecos) {
  if (!qqSecos) return null
  return (Number(qqArrozEntero) / Number(qqSecos)) * 100
}

export function calcularPrecioVentaPromedio(ventas) {
  if (!ventas || ventas.length === 0) return null
  const totalQq = ventas.reduce((sum, v) => sum + (Number(v.qq_vendidos) || 0), 0)
  if (!totalQq) return null
  const totalIngresos = ventas.reduce((sum, v) => sum + (Number(v.qq_vendidos) || 0) * (Number(v.precio_qq) || 0), 0)
  return totalIngresos / totalQq
}

export function sumar(items, key) {
  if (!items) return 0
  return items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)
}

/**
 * The schema has no explicit link between a preseco secado row and the
 * seco row that continues from it, so the two are matched by bascula_id +
 * estado. When more than one preseco row exists for the same viaje (a data
 * mistake), the most recent one by fecha is treated as the one in progress.
 */
export function findPresecoRecord(secados, basculaId, excludeId = null) {
  if (!secados || !basculaId) return null
  const candidates = secados.filter(
    (s) => s.id !== excludeId && s.estado === 'preseco' && String(s.bascula_id) === String(basculaId)
  )
  if (candidates.length === 0) return null
  return candidates.reduce((latest, s) => {
    if (!latest) return s
    return new Date(s.fecha) >= new Date(latest.fecha) ? s : latest
  }, null)
}

/**
 * A preseco row is superseded once a seco row for the same viaje continues
 * from it (de_preseco === true) — its qq_seco is an intermediate weight
 * already folded into the final seco weight, so it must not be counted
 * again in production totals.
 */
export function isSecadoSuperseded(secado, allSecados) {
  if (!secado || secado.estado !== 'preseco') return false
  return (allSecados ?? []).some(
    (s) => s.id !== secado.id && s.estado === 'seco' && s.de_preseco && String(s.bascula_id) === String(secado.bascula_id)
  )
}

/**
 * Secado rows that should count toward production totals: everything
 * except preseco rows already superseded by a final seco row.
 */
export function secadosVigentes(secados) {
  if (!secados) return []
  return secados.filter((s) => !isSecadoSuperseded(s, secados))
}
