import { useMemo } from 'react'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useTable } from '../../hooks/useData'
import {
  sumar,
  calcularCostoPorQq,
  calcularMargenPorQq,
  calcularPrecioVentaPromedio,
  calcularRendimientoAE,
  calcularMerma
} from '../../lib/formulas'
import { formatCordoba, formatQq, formatPercent } from '../../lib/formatters'
import KPICard from '../../components/ui/KPICard.jsx'
import StatRow from '../../components/ui/StatRow.jsx'

const DERIVADOS_KEYS = ['arroz_entero', 'semolina', 'puntilla', 'pallana', 'fina']
const DERIVADOS_LABELS = {
  arroz_entero: 'Arroz entero',
  semolina: 'Semolina',
  puntilla: 'Puntilla',
  pallana: 'Pallana',
  fina: 'Fina'
}

export default function Reportes() {
  const { selectedCicloId, selectedCiclo, ciclos, loading: ciclosLoading } = useCiclo()
  const enabled = !!selectedCicloId
  const cicloFilter = [['ciclo_id', 'eq', selectedCicloId]]

  const { data: cosechas, loading: lc } = useTable('cosechas', { filters: cicloFilter, enabled })
  const { data: gastos, loading: lg } = useTable('gastos_campo', { filters: cicloFilter, enabled })
  const { data: basculas, loading: lb } = useTable('basculas', { filters: cicloFilter, enabled })
  const { data: secados, loading: ls } = useTable('secados', { filters: cicloFilter, enabled })
  const { data: embodegados, loading: le } = useTable('embodegados', { filters: cicloFilter, enabled })
  const { data: turnos, loading: lt } = useTable('turnos_trillo', { filters: cicloFilter, enabled })
  const { data: ventas, loading: lv } = useTable('ventas', { filters: cicloFilter, enabled })

  const loading = ciclosLoading || (enabled && (lc || lg || lb || ls || le || lt || lv))

  const report = useMemo(() => {
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
    const trilladoTotal = turnos.reduce(
      (sum, t) => sum + (Number(t.precio_trillado_qq) || 0) * (Number(t.qq_totales) || 0) + (Number(t.costo_llenado_pila) || 0),
      0
    )
    const gastosTotal = gastosCampoTotal + fleteTotal + granzaTotal + secadoTotal + embodegadoTotal + trilladoTotal
    const ingresosTotal = ventas.reduce((sum, v) => sum + (Number(v.qq_vendidos) || 0) * (Number(v.precio_qq) || 0), 0)
    const utilidadNeta = ingresosTotal - gastosTotal

    const qqCosechados = sumar(cosechas, 'qq_cosechados')
    const qqGranza = sumar(basculas, 'qq_neto')
    const qqSecos = sumar(secados, 'qq_seco')
    const merma = calcularMerma(qqGranza, qqSecos)
    const mermaPct = qqGranza ? (merma / qqGranza) * 100 : null

    const derivadosTotales = DERIVADOS_KEYS.reduce((acc, key) => {
      acc[key] = turnos.reduce((sum, t) => sum + (Number(t.derivados?.[key]) || 0), 0)
      return acc
    }, {})
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
  }, [cosechas, gastos, basculas, secados, embodegados, turnos, ventas])

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

  return (
    <div className="fade-in">
      <div className="section-header">
        <h2>Reporte &middot; {selectedCiclo?.nombre}</h2>
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
    </div>
  )
}
