import { useMemo } from 'react'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useTable } from '../../hooks/useData'
import {
  sumar,
  calcularCostoPorQq,
  calcularMargenPorQq,
  calcularPrecioVentaPromedio,
  calcularRendimientoAE,
  calcularMerma,
  secadosFinalizados,
  atribuirTurnosPorFinca,
  DERIVADOS_KEYS
} from '../../lib/formulas'
import { formatCordoba, formatQq, formatPercent } from '../../lib/formatters'
import KPICard from '../../components/ui/KPICard.jsx'
import StatRow from '../../components/ui/StatRow.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

const DERIVADOS_LABELS = {
  arroz_entero: 'Arroz entero',
  semolina: 'Semolina',
  puntilla: 'Puntilla',
  pallana: 'Pallana',
  fina: 'Fina'
}

function derivadosVacios() {
  return Object.fromEntries(DERIVADOS_KEYS.map((k) => [k, 0]))
}

/** Sums every finca's turno attribution back into one ciclo-wide total. */
function sumarAtribuciones(atribucionTurnos) {
  let costo = 0
  const derivados = derivadosVacios()
  for (const { costo: c, derivados: d } of atribucionTurnos.values()) {
    costo += c
    for (const key of DERIVADOS_KEYS) derivados[key] += d[key]
  }
  return { costo, derivados }
}

/**
 * Computes the full P&L for one slice of records (either every record in
 * the ciclo, or just the ones belonging to a single finca). Kept as a pure
 * function so the ciclo-wide total and each per-finca breakdown share
 * identical math instead of two copies that could drift apart.
 *
 * Turno-derived numbers (trilladoTotal, derivados) are NOT computed from a
 * raw `turnos` array here — a turno has no trustworthy finca_id of its own
 * (it mills grain from básculas that can belong to different fincas), so
 * they're passed in pre-attributed via trilladoContribucion/
 * derivadosContribucion (see atribuirTurnosPorFinca in formulas.js).
 */
function computePL({ cosechas, gastos, basculas, secados, embodegados, ventas, trilladoContribucion, derivadosContribucion }) {
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
    ventasPorDerivado
  }
}

/**
 * Buckets the other 6 tables by their own finca_id (null -> "sin finca"),
 * and merges in each finca's proportional share of turno cost/derivados
 * from atribucionTurnos. A finca that only has turno activity (no direct
 * gasto/báscula/etc rows) still gets its own bucket.
 */
function agruparPorFinca({ cosechas, gastos, basculas, secados, embodegados, ventas, atribucionTurnos }) {
  const claves = new Set()
  const porTabla = { cosechas, gastos, basculas, secados, embodegados, ventas }
  for (const rows of Object.values(porTabla)) {
    for (const r of rows) claves.add(r.finca_id ?? null)
  }
  for (const key of atribucionTurnos.keys()) claves.add(key)

  return Array.from(claves).map((fincaId) => {
    const filtro = (rows) => rows.filter((r) => (r.finca_id ?? null) === fincaId)
    const turnoInfo = atribucionTurnos.get(fincaId) ?? { costo: 0, derivados: derivadosVacios(), medido: true }
    return {
      fincaId,
      medido: turnoInfo.medido,
      pl: computePL({
        cosechas: filtro(cosechas),
        gastos: filtro(gastos),
        basculas: filtro(basculas),
        secados: filtro(secados),
        embodegados: filtro(embodegados),
        ventas: filtro(ventas),
        trilladoContribucion: turnoInfo.costo,
        derivadosContribucion: turnoInfo.derivados
      })
    }
  })
}

export default function Reportes() {
  const { selectedCicloId, selectedCiclo, ciclos, loading: ciclosLoading, error: ciclosError } = useCiclo()
  const enabled = !!selectedCicloId
  const cicloFilter = [['ciclo_id', 'eq', selectedCicloId]]

  const { data: fincas } = useTable('fincas', { orderBy: { column: 'nombre' } })
  const { data: cosechas, loading: lc, error: ec } = useTable('cosechas', { filters: cicloFilter, enabled })
  const { data: gastos, loading: lg, error: eg } = useTable('gastos_campo', { filters: cicloFilter, enabled })
  const { data: basculas, loading: lb, error: eb } = useTable('basculas', { filters: cicloFilter, enabled })
  const { data: secados, loading: ls, error: es } = useTable('secados', { filters: cicloFilter, enabled })
  const { data: embodegados, loading: le, error: ee } = useTable('embodegados', { filters: cicloFilter, enabled })
  const { data: turnos, loading: lt, error: et } = useTable('turnos_trillo', { filters: cicloFilter, enabled })
  const { data: ventas, loading: lv, error: ev } = useTable('ventas', { filters: cicloFilter, enabled })

  const loading = ciclosLoading || (enabled && (lc || lg || lb || ls || le || lt || lv))
  const anyFetchError = ec ?? eg ?? eb ?? es ?? ee ?? et ?? ev

  const atribucionTurnos = useMemo(() => atribuirTurnosPorFinca(turnos, basculas), [turnos, basculas])

  const report = useMemo(() => {
    const { costo, derivados } = sumarAtribuciones(atribucionTurnos)
    return computePL({
      cosechas,
      gastos,
      basculas,
      secados,
      embodegados,
      ventas,
      trilladoContribucion: costo,
      derivadosContribucion: derivados
    })
  }, [cosechas, gastos, basculas, secados, embodegados, ventas, atribucionTurnos])

  const porFinca = useMemo(
    () => agruparPorFinca({ cosechas, gastos, basculas, secados, embodegados, ventas, atribucionTurnos }),
    [cosechas, gastos, basculas, secados, embodegados, ventas, atribucionTurnos]
  )

  const fincaNombre = (id) => fincas.find((f) => f.id === id)?.nombre ?? '—'

  if (ciclosError && ciclos.length === 0) {
    return <ErrorState error={ciclosError} />
  }
  if (!ciclosLoading && ciclos.length === 0) {
    return <div className="empty-state">No hay ciclos creados todavía.</div>
  }
  if (!selectedCicloId) {
    return <div className="empty-state">Selecciona un ciclo para ver su reporte.</div>
  }
  if (loading) {
    return (
      <div className="loading-wrap">
        <span className="spinner" />
      </div>
    )
  }

  // Fincas con nombre primero (alfabético), "Sin finca asignada" al final.
  const porFincaOrdenado = [...porFinca].sort((a, b) => {
    if (a.fincaId == null) return 1
    if (b.fincaId == null) return -1
    return fincaNombre(a.fincaId).localeCompare(fincaNombre(b.fincaId))
  })

  return (
    <div className="fade-in">
      {anyFetchError && (
        <div className="stale-banner">⚠️ Algunos datos no se pudieron cargar. {anyFetchError.message}</div>
      )}
      <div className="section-header">
        <h2>Reporte &middot; {selectedCiclo?.nombre}</h2>
        <span className="chip chip-green">Total del ciclo</span>
      </div>

      <div className="kpi-grid">
        <KPICard label="Ingresos" value={formatCordoba(report.ingresosTotal)} icon="💰" tone="green" />
        <KPICard label="Gastos" value={formatCordoba(report.gastosTotal)} icon="📉" tone="red" />
        <KPICard
          label="Utilidad neta"
          value={formatCordoba(report.utilidadNeta)}
          icon="📈"
          tone={report.utilidadNeta >= 0 ? 'green' : 'red'}
        />
        <KPICard label="Rendimiento AE" value={report.rendimientoAE != null ? formatPercent(report.rendimientoAE) : '—'} icon="🏭" tone="teal" />
      </div>

      <div className="section-header">
        <h2>Desglose de gastos</h2>
      </div>
      <div className="card card-pad">
        <StatRow icon="🧑‍🌾" label="Gastos de campo" value={formatCordoba(report.gastosCampoTotal)} />
        <StatRow icon="🚚" label="Flete" value={formatCordoba(report.fleteTotal)} />
        <StatRow icon="🌾" label="Granza comprada" value={formatCordoba(report.granzaTotal)} />
        <StatRow icon="☀️" label="Secado" value={formatCordoba(report.secadoTotal)} />
        <StatRow icon="📦" label="Embodegado (sacos)" value={formatCordoba(report.embodegadoTotal)} />
        <StatRow icon="🏭" label="Trillado" value={formatCordoba(report.trilladoTotal)} />
      </div>

      <div className="section-header">
        <h2>Costo por quintal</h2>
      </div>
      <div className="cost-strip">
        <div className="cost-strip-item">
          <span className="cost-strip-label">Costo / QQ seco</span>
          <span className="cost-strip-value mono">{report.costoPorQqSeco != null ? formatCordoba(report.costoPorQqSeco) : '—'}</span>
        </div>
        <div className="cost-strip-item">
          <span className="cost-strip-label">Costo / QQ AE</span>
          <span className="cost-strip-value mono">{report.costoPorQqAE != null ? formatCordoba(report.costoPorQqAE) : '—'}</span>
        </div>
        <div className="cost-strip-item">
          <span className="cost-strip-label">Margen / QQ</span>
          <span className={'cost-strip-value mono ' + (report.margenPorQq >= 0 ? 'positive' : 'negative')}>
            {report.margenPorQq != null ? formatCordoba(report.margenPorQq) : '—'}
          </span>
        </div>
      </div>

      <div className="section-header">
        <h2>Cadena de producción</h2>
      </div>
      <div className="card card-pad">
        <StatRow icon="🌱" label="QQ cosechados" value={formatQq(report.qqCosechados)} />
        <StatRow icon="🌾" label="QQ granza (báscula)" value={formatQq(report.qqGranza)} />
        <StatRow icon="☀️" label="QQ secos" value={formatQq(report.qqSecos)} />
        <StatRow icon="📉" label="Merma" value={`${formatQq(report.merma)} (${report.mermaPct != null ? formatPercent(report.mermaPct) : '—'})`} />
      </div>

      <div className="section-header">
        <h2>Ventas por derivado</h2>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Derivado</th>
              <th>QQ vendidos</th>
              <th>Precio prom./QQ</th>
              <th>Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {report.ventasPorDerivado.map((row) => (
              <tr key={row.key}>
                <td>{DERIVADOS_LABELS[row.key]}</td>
                <td className="mono">{formatQq(row.qq, 1)}</td>
                <td className="mono">{row.precioPromedio != null ? formatCordoba(row.precioPromedio) : '—'}</td>
                <td className="mono">{formatCordoba(row.ingresos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-header">
        <h2>Desglose por finca</h2>
      </div>
      {porFincaOrdenado.length === 0 ? (
        <div className="empty-state">
          <p>No hay registros en este ciclo todavía.</p>
        </div>
      ) : (
        porFincaOrdenado.map(({ fincaId, medido, pl }) => (
          <div className="card card-pad" key={fincaId ?? 'sin-finca'} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
              <strong style={{ fontSize: 15 }}>{fincaId ? fincaNombre(fincaId) : 'Sin finca asignada'}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusChip status={medido ? 'medido' : 'estimado'} />
                {!fincaId && <span className="chip">⚠️ revisar asignación</span>}
              </div>
            </div>
            {!medido && (
              <p className="field-hint" style={{ marginTop: -4, marginBottom: 10 }}>
                Trillado y derivados incluyen turnos compartidos con otra(s) finca(s) — esa porción se reparte por qq, no es una medición directa.
              </p>
            )}
            <StatRow icon="💰" label="Ingresos" value={formatCordoba(pl.ingresosTotal)} />
            <StatRow icon="🧑‍🌾" label="Gastos operativos" value={formatCordoba(pl.gastosOperativos)} />
            <StatRow icon="🌾" label="Compra de granza a terceros" value={formatCordoba(pl.granzaTotal)} />
            <StatRow
              icon="📈"
              label="Utilidad neta"
              value={formatCordoba(pl.utilidadNeta)}
            />
            <StatRow icon="☀️" label="Producción (QQ secos)" value={formatQq(pl.qqSecos)} />
            <StatRow
              icon="📉"
              label="Merma"
              value={`${formatQq(pl.merma)} (${pl.mermaPct != null ? formatPercent(pl.mermaPct) : '—'})`}
            />
            <StatRow icon="🏭" label="Rendimiento AE" value={pl.rendimientoAE != null ? formatPercent(pl.rendimientoAE) : '—'} />
            <StatRow icon="💵" label="Costo / QQ seco" value={pl.costoPorQqSeco != null ? formatCordoba(pl.costoPorQqSeco) : '—'} />
          </div>
        ))
      )}
    </div>
  )
}
