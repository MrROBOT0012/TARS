import { parseCalendarDate } from './formatters'

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

/**
 * Total qq vendidos — the denominator margenPorQq is implicitly scoped to,
 * as opposed to costoPorQqSeco's qqSecos (todo lo producido). Exposed
 * separately so callers can show that scope instead of letting the two
 * per-qq numbers look directly comparable when production hasn't fully
 * sold yet.
 */
export function calcularQqVendidos(ventas) {
  return sumar(ventas, 'qq_vendidos')
}

export function calcularPctProduccionVendida(qqVendidos, qqSecos) {
  if (!qqSecos) return null
  return (Number(qqVendidos) / Number(qqSecos)) * 100
}

/**
 * True when utilidadNeta (costo de todo lo producido vs. ingreso de lo
 * vendido hasta ahora) y margenPorQq (precio de lo vendido vs. costo de
 * todo lo producido, por unidad) caen en signos opuestos — la señal de que
 * queda producción ya costeada pero sin vender, así que ningún número por
 * sí solo describe el resultado del ciclo.
 */
export function hayDivergenciaMargen(utilidadNeta, margenPorQq) {
  if (utilidadNeta == null || margenPorQq == null) return false
  return (utilidadNeta < 0 && margenPorQq > 0) || (utilidadNeta > 0 && margenPorQq < 0)
}

/**
 * Explicación en lenguaje llano de la divergencia anterior, compartida por
 * Dashboard y Reportes para que el texto nunca se desalinee entre pantallas.
 */
export function mensajeDivergenciaMargen(utilidadNeta, margenPorQq) {
  if (!hayDivergenciaMargen(utilidadNeta, margenPorQq)) return null
  if (margenPorQq > 0) {
    return 'Todavía hay producción sin vender este ciclo, así que la utilidad neta aún no refleja el resultado completo — el margen por quintal ya vendido sí es positivo.'
  }
  return 'Todavía hay producción sin vender este ciclo, así que el margen por quintal vendido puede no representar el resultado final — la utilidad neta del ciclo completo sigue siendo positiva.'
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

export function derivadosVacios() {
  return Object.fromEntries(DERIVADOS_KEYS.map((k) => [k, 0]))
}

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
          derivados: derivadosVacios(),
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

/** Sums every finca's turno attribution back into one combined total. */
export function sumarAtribuciones(atribucionTurnos) {
  let costo = 0
  const derivados = derivadosVacios()
  for (const { costo: c, derivados: d } of atribucionTurnos.values()) {
    costo += c
    for (const key of DERIVADOS_KEYS) derivados[key] += d[key]
  }
  return { costo, derivados }
}

// ---------------------------------------------------------------------
// Ventas — stock availability (produced minus already-sold, per finca+derivado)
// ---------------------------------------------------------------------

/** Qq of one derivado attributed to one finca across every turno, via the same proportional split used everywhere else (atribuirTurnosPorFinca). */
export function calcularQqProducido(fincaId, derivado, turnos, basculas) {
  const atribucion = atribuirTurnosPorFinca(turnos, basculas)
  return atribucion.get(fincaId ?? null)?.derivados[derivado] ?? 0
}

/**
 * Qq of one derivado already sold for one finca, from existing ventas rows.
 * excludeVentaId lets an edit check availability against every OTHER venta
 * without double-counting its own prior value.
 */
export function calcularQqVendido(fincaId, derivado, ventas, excludeVentaId = null) {
  return (ventas ?? [])
    .filter((v) => (v.finca_id ?? null) === (fincaId ?? null) && v.derivado === derivado && v.id !== excludeVentaId)
    .reduce((sum, v) => sum + (Number(v.qq_vendidos) || 0), 0)
}

/**
 * How much of one derivado a finca has left to sell: produced (proportional
 * turno attribution) minus already-sold (every other venta). Can go negative
 * when a finca is already oversold from prior bad data — that's surfaced as
 * 0 or less, not clamped, so callers can tell "nothing left" apart from
 * "already over."
 */
export function calcularQqDisponibleParaVenta(fincaId, derivado, { turnos, basculas, ventas }, excludeVentaId = null) {
  const producido = calcularQqProducido(fincaId, derivado, turnos, basculas)
  const vendido = calcularQqVendido(fincaId, derivado, ventas, excludeVentaId)
  return producido - vendido
}

/**
 * Computes the full P&L for one slice of records — every record in a ciclo,
 * just the ones belonging to a single finca within a ciclo, or (via
 * Comparativa) a whole separate ciclo entirely. Kept as a single pure
 * function so Dashboard/Reportes/Comparativa numbers can never drift apart
 * from independently-reimplemented copies of the same math.
 *
 * Turno-derived numbers (trilladoTotal, derivados) are NOT computed from a
 * raw `turnos` array here — a turno has no trustworthy finca_id of its own
 * (it mills grain from básculas that can belong to different fincas), so
 * they're passed in pre-attributed via trilladoContribucion/
 * derivadosContribucion — see atribuirTurnosPorFinca + sumarAtribuciones.
 */
export function computePL({ cosechas, gastos, basculas, secados, embodegados, ventas, trilladoContribucion, derivadosContribucion }) {
  const gastosCampoTotal = sumar(gastos, 'monto')
  const fleteTotal = sumar(basculas, 'costo_flete_total')
  const granzaTotal = sumar(basculas, 'costo_granza_total')
  const secadoTotal = secados.reduce(
    (sum, s) => sum + ((Number(s.precio_descargue) || 0) + (Number(s.precio_secado) || 0)) * (Number(s.qq_seco) || 0),
    0
  )
  const embodegadoTotal = embodegados.reduce(
    (sum, e) => sum + (Number(e.precio_saco) || 0) * (Number(e.sacos) || 0),
    0
  )
  const trilladoTotal = trilladoContribucion

  const gastosOperativos = gastosCampoTotal + fleteTotal + secadoTotal + embodegadoTotal + trilladoTotal
  const gastosTotal = gastosOperativos + granzaTotal
  const ingresosTotal = ventas.reduce((sum, v) => sum + (Number(v.qq_vendidos) || 0) * (Number(v.precio_qq) || 0), 0)
  const utilidadNeta = ingresosTotal - gastosTotal

  const qqCosechados = sumar(cosechas, 'qq_cosechados')
  const qqGranza = sumar(basculas, 'qq_neto')
  // Solo secados en estado 'seco' cuentan como producción terminada — un
  // lote 'en_proceso' o 'preseco' todavía no mueve estos números.
  const qqSecos = sumar(secadosFinalizados(secados), 'qq_seco')
  const merma = calcularMerma(qqGranza, qqSecos)
  const mermaPct = qqGranza ? (merma / qqGranza) * 100 : null

  const derivadosTotales = derivadosContribucion
  const qqArrozEntero = derivadosTotales.arroz_entero || 0
  const rendimientoAE = calcularRendimientoAE(qqArrozEntero, qqSecos)

  const costoPorQqSeco = calcularCostoPorQq(gastosTotal, qqSecos)
  const costoPorQqAE = calcularCostoPorQq(gastosTotal, qqArrozEntero)
  const precioVentaPromedio = calcularPrecioVentaPromedio(ventas)
  const margenPorQq = calcularMargenPorQq(precioVentaPromedio, costoPorQqSeco)
  const qqVendidos = calcularQqVendidos(ventas)
  const pctProduccionVendida = calcularPctProduccionVendida(qqVendidos, qqSecos)

  const ventasPorDerivado = DERIVADOS_KEYS.map((key) => {
    const items = ventas.filter((v) => v.derivado === key)
    const qq = sumar(items, 'qq_vendidos')
    const ingresos = items.reduce((sum, v) => sum + (Number(v.qq_vendidos) || 0) * (Number(v.precio_qq) || 0), 0)
    return { key, qq, ingresos, precioPromedio: qq ? ingresos / qq : null }
  })

  return {
    gastosCampoTotal,
    fleteTotal,
    granzaTotal,
    secadoTotal,
    embodegadoTotal,
    trilladoTotal,
    gastosOperativos,
    gastosTotal,
    ingresosTotal,
    utilidadNeta,
    qqCosechados,
    qqGranza,
    qqSecos,
    merma,
    mermaPct,
    derivadosTotales,
    qqArrozEntero,
    rendimientoAE,
    costoPorQqSeco,
    costoPorQqAE,
    precioVentaPromedio,
    margenPorQq,
    qqVendidos,
    pctProduccionVendida,
    ventasPorDerivado
  }
}

/**
 * Computes computePL() for one ciclo out of a larger unfiltered dataset
 * spanning multiple ciclos (used by Comparativa) — filters all 7 tables to
 * cicloId first, then runs the exact same turno-attribution + computePL
 * pipeline Reportes.jsx uses for "the selected ciclo," so comparison
 * numbers can never drift from what Reportes/Dashboard show individually.
 */
export function computePLParaCiclo(cicloId, { cosechas, gastos, basculas, secados, embodegados, turnos, ventas }) {
  const filtro = (rows) => (rows ?? []).filter((r) => r.ciclo_id === cicloId)
  const cBasculas = filtro(basculas)
  const cTurnos = filtro(turnos)
  const atribucionTurnos = atribuirTurnosPorFinca(cTurnos, cBasculas)
  const { costo, derivados } = sumarAtribuciones(atribucionTurnos)
  return computePL({
    cosechas: filtro(cosechas),
    gastos: filtro(gastos),
    basculas: cBasculas,
    secados: filtro(secados),
    embodegados: filtro(embodegados),
    ventas: filtro(ventas),
    trilladoContribucion: costo,
    derivadosContribucion: derivados
  })
}

// ---------------------------------------------------------------------
// Financiamiento (financed-finca settlement)
// ---------------------------------------------------------------------

const MS_POR_DIA = 24 * 60 * 60 * 1000

/**
 * Daily simple-interest rate implied by a finca's tasa_interes +
 * tasa_interes_periodo. 'anual' divides by 365, 'mensual' by 30 (the usual
 * informal-lending convention — not actual days-in-month). Returns 0 if
 * interest doesn't apply or no rate is set, so callers never need a
 * separate "is interest even on" branch.
 */
export function tasaDiariaFinanciamiento(finca) {
  if (!finca?.interes_aplica) return 0
  const tasa = Number(finca.tasa_interes)
  if (!Number.isFinite(tasa) || tasa <= 0) return 0
  const divisor = finca.tasa_interes_periodo === 'mensual' ? 30 : 365
  return tasa / 100 / divisor
}

/**
 * Walks a finca's financiamiento movements in chronological order,
 * maintaining a running principal balance (adelanto adds, abono/aporte
 * subtract) and — if the finca has interes_aplica — simple interest
 * prorated daily on whatever the principal actually was during each
 * interval, recalculated every time a movement changes it. Interest is
 * tracked separately from principal (simple, not compound: accrued
 * interest never itself accrues interest). The final interval runs from
 * the last movement to `fechaCorte` (defaults to today), so the balance
 * reflects interest accrued right up to "now" even between movements.
 *
 * A movement with a future/negative interval (bad data) contributes 0
 * interest for that interval rather than going negative.
 */
export function calcularSaldoFinanciamiento(movimientos, finca, fechaCorte = new Date()) {
  const ordenados = [...(movimientos ?? [])].sort(
    (a, b) => parseCalendarDate(a.fecha) - parseCalendarDate(b.fecha)
  )
  const tasaDiaria = tasaDiariaFinanciamiento(finca)

  let principal = 0
  let interesAcumulado = 0
  let fechaAnterior = null
  const historial = []

  for (const mov of ordenados) {
    const fechaMov = parseCalendarDate(mov.fecha)
    if (fechaAnterior && tasaDiaria > 0 && principal > 0) {
      const dias = Math.max(0, Math.round((fechaMov - fechaAnterior) / MS_POR_DIA))
      interesAcumulado += principal * tasaDiaria * dias
    }
    const monto = Number(mov.monto) || 0
    principal += mov.tipo === 'adelanto' ? monto : -monto
    fechaAnterior = fechaMov
    historial.push({ ...mov, saldoPrincipalDespues: principal, interesAcumuladoHasta: interesAcumulado })
  }

  if (fechaAnterior && tasaDiaria > 0 && principal > 0) {
    const dias = Math.max(0, Math.round((fechaCorte - fechaAnterior) / MS_POR_DIA))
    interesAcumulado += principal * tasaDiaria * dias
  }

  return {
    historial,
    saldoPrincipal: principal,
    interesAcumulado,
    saldoTotal: principal + interesAcumulado
  }
}

/**
 * Value of the granza a finca has actually delivered, priced. Only counts
 * básculas where precio_granza_qq is set — in this schema that field is
 * only ever captured when origen_viaje = 'comprado' (see Bascula.jsx), so a
 * financed producer's delivery must be logged that way to count here. Also
 * returns how many qq came in with no price, so the caller can warn instead
 * of silently under-counting.
 */
export function calcularValorGranzaEntregada(basculas) {
  let valor = 0
  let qqConPrecio = 0
  let qqSinPrecio = 0
  for (const b of basculas ?? []) {
    const qq = Number(b.qq_neto) || 0
    const precio = Number(b.precio_granza_qq) || 0
    if (precio > 0) {
      valor += qq * precio
      qqConPrecio += qq
    } else {
      qqSinPrecio += qq
    }
  }
  return { valor, qqConPrecio, qqSinPrecio }
}

/**
 * Compares what's been financed (principal + accrued interest) against the
 * priced value of granza delivered, and produces the settlement outcome:
 * - valorGranza < totalFinanciado: the producer still owes the difference
 *   (saldoPendiente) — this is not forced to zero, it's meant to carry
 *   over to whatever ciclo comes next.
 * - valorGranza > totalFinanciado: the surplus is split — the producer's
 *   cut is porcentajeGananciaProductor% of it, the rest stays with the
 *   operation.
 */
export function calcularLiquidacionFinanciamiento(totalFinanciado, valorGranza, porcentajeGananciaProductor) {
  const diferencia = valorGranza - totalFinanciado
  if (diferencia < 0) {
    return { resultado: 'pendiente', saldoPendiente: -diferencia, superavit: 0, gananciaProductor: 0, gananciaOperacion: 0 }
  }
  const pct = Number(porcentajeGananciaProductor) || 0
  const gananciaProductor = diferencia * (pct / 100)
  return {
    resultado: 'superavit',
    saldoPendiente: 0,
    superavit: diferencia,
    gananciaProductor,
    gananciaOperacion: diferencia - gananciaProductor
  }
}
