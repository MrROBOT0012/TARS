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
