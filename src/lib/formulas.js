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
 * Secado rows that count toward finished-production totals: only rows in
 * their final estado ('seco'). 'en_proceso' and 'preseco' rows are excluded
 * even mid-chain — an in-progress drying batch must not move production
 * numbers (QQ secos, merma, rendimiento, costo/qq) until it's actually done.
 */
export function secadosFinalizados(secados) {
  if (!secados) return []
  return secados.filter((s) => s.estado === 'seco')
}

export const DERIVADOS_KEYS = ['arroz_entero', 'semolina', 'puntilla', 'pallana', 'fina']

/**
 * A turno_trillo has no finca_id of its own that can be trusted for P&L
 * attribution — it mills grain from whichever básculas (viajes) were
 * checked into it, and those can belong to different fincas. The distinct
 * finca_ids among a turno's básculas is the only reliable signal for "which
 * fincas does this turno touch." Básculas whose id isn't found (bad/missing
 * data) are skipped rather than surfaced as null.
 */
export function fincasInvolucradasEnTurno(turno, basculas) {
  const ids = Array.isArray(turno?.bascula_ids) ? turno.bascula_ids : []
  const involucradas = ids
    .map((id) => (basculas ?? []).find((b) => String(b.id) === String(id)))
    .filter(Boolean)
  return [...new Set(involucradas.map((b) => b.finca_id ?? null))]
}

/**
 * Splits one turno across the fincas of its constituent básculas,
 * proportional to each finca's share of the qq_neto that was weighed in
 * (not qq_totales/qq_embodegados — the split reflects whose paddy it was
 * at intake, before any drying/milling loss). Returns shares that sum to 1
 * across the returned entries.
 *
 * Edge cases: if none of the turno's bascula_ids resolve to a real báscula,
 * the whole turno is attributed to fincaId: null (can't attribute — same
 * bucket as "sin finca asignada" elsewhere). If básculas resolve but their
 * qq_neto sums to 0, the turno is split evenly across the distinct fincas
 * found (better than an undefined 0/0 split).
 */
export function atribucionesTurno(turno, basculas) {
  const ids = Array.isArray(turno?.bascula_ids) ? turno.bascula_ids : []
  const involucradas = ids
    .map((id) => (basculas ?? []).find((b) => String(b.id) === String(id)))
    .filter(Boolean)

  if (involucradas.length === 0) return [{ fincaId: null, share: 1 }]

  const qqPorFinca = new Map()
  for (const b of involucradas) {
    const key = b.finca_id ?? null
    qqPorFinca.set(key, (qqPorFinca.get(key) || 0) + (Number(b.qq_neto) || 0))
  }

  const totalQq = involucradas.reduce((sum, b) => sum + (Number(b.qq_neto) || 0), 0)
  if (totalQq <= 0) {
    const n = qqPorFinca.size
    return Array.from(qqPorFinca.keys()).map((fincaId) => ({ fincaId, share: 1 / n }))
  }

  return Array.from(qqPorFinca.entries()).map(([fincaId, qq]) => ({ fincaId, share: qq / totalQq }))
}

/**
 * Aggregates every non-'parcial' turno's cost and derivados across all
 * fincas it touches, proportionally split by atribucionesTurno. A finca is
 * marked medido:false ("estimado") the moment any turno contributing to it
 * spanned more than one finca — even if other turnos for that same finca
 * were single-finca and exact.
 *
 * Returns a Map<fincaId|null, { costo, derivados, medido }>.
 */
export function atribuirTurnosPorFinca(turnos, basculas) {
  const turnosCompletados = (turnos ?? []).filter((t) => t.estado !== 'parcial')
  const resultado = new Map()

  for (const turno of turnosCompletados) {
    const costoTurno =
      (Number(turno.precio_trillado_qq) || 0) * (Number(turno.qq_totales) || 0) + (Number(turno.costo_llenado_pila) || 0)
    const atribuciones = atribucionesTurno(turno, basculas)
    const esMixto = atribuciones.length > 1

    for (const { fincaId, share } of atribuciones) {
      if (!resultado.has(fincaId)) {
        resultado.set(fincaId, {
          costo: 0,
          derivados: Object.fromEntries(DERIVADOS_KEYS.map((k) => [k, 0])),
          medido: true
        })
      }
      const acc = resultado.get(fincaId)
      acc.costo += costoTurno * share
      for (const key of DERIVADOS_KEYS) {
        acc.derivados[key] += (Number(turno.derivados?.[key]) || 0) * share
      }
      if (esMixto) acc.medido = false
    }
  }

  return resultado
}
