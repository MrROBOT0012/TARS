import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
import FlowCard from '../../components/ui/FlowCard.jsx'
import DerivChip from '../../components/ui/DerivChip.jsx'
import ActionButton from '../../components/ui/ActionButton.jsx'
import StatRow from '../../components/ui/StatRow.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import './dashboard.css'

const DERIVADOS_KEYS = ['arroz_entero', 'semolina', 'puntilla', 'pallana', 'fina']

const QUICK_ACTIONS = [
  { key: 'bascula', label: 'Viaje (báscula)', icon: '⚖️', path: '/app/bascula?new=1' },
  { key: 'secado', label: 'Secado', icon: '☀️', path: '/app/proceso?tab=secado&new=1' },
  { key: 'embodegado', label: 'Embodegado', icon: '📦', path: '/app/proceso?tab=embodegado&new=1' },
  { key: 'turno', label: 'Turno trillo', icon: '🏭', path: '/app/proceso?tab=turnos&new=1' },
  { key: 'venta', label: 'Venta', icon: '💰', path: '/app/ventas?new=1' },
  { key: 'gasto', label: 'Gasto campo', icon: '🧑‍🌾', path: '/app/campo?new=1' }
]

export default function Dashboard() {
  const { selectedCicloId, loading: ciclosLoading, error: ciclosError, ciclos } = useCiclo()
  const navigate = useNavigate()

  const enabled = !!selectedCicloId
  const cicloFilter = [['ciclo_id', 'eq', selectedCicloId]]

  const { data: gastos, loading: lg, error: eg } = useTable('gastos_campo', { filters: cicloFilter, enabled })
  const { data: basculas, loading: lb, error: eb } = useTable('basculas', { filters: cicloFilter, enabled })
  const { data: secados, loading: ls, error: es } = useTable('secados', { filters: cicloFilter, enabled })
  const { data: embodegados, loading: le, error: ee } = useTable('embodegados', { filters: cicloFilter, enabled })
  const { data: turnos, loading: lt, error: et } = useTable('turnos_trillo', { filters: cicloFilter, enabled })
  const { data: ventas, loading: lv, error: ev } = useTable('ventas', { filters: cicloFilter, enabled })

  const loading = ciclosLoading || (enabled && (lg || lb || ls || le || lt || lv))
  const anyFetchError = eg ?? eb ?? es ?? ee ?? et ?? ev

  const resumen = useMemo(() => {
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
    const precioVentaPromedio = calcularPrecioVentaPromedio(ventas)
    const margenPorQq = calcularMargenPorQq(precioVentaPromedio, costoPorQqSeco)

    return {
      gastosTotal,
      ingresosTotal,
      utilidadNeta,
      qqGranza,
      qqSecos,
      merma,
      mermaPct,
      derivadosTotales,
      qqArrozEntero,
      rendimientoAE,
      costoPorQqSeco,
      precioVentaPromedio,
      margenPorQq
    }
  }, [gastos, basculas, secados, embodegados, turnos, ventas])

  const viajesActivos = useMemo(() => {
    return basculas
      .map((b) => {
        const secado = secados.find((s) => s.bascula_id === b.id)
        const embodegado = embodegados.find((e) => e.bascula_id === b.id)
        const turno = turnos.find((t) => Array.isArray(t.bascula_ids) && t.bascula_ids.includes(b.id))
        return { bascula: b, secado, embodegado, turno }
      })
      .filter(({ turno }) => !turno)
      .slice(0, 6)
  }, [basculas, secados, embodegados, turnos])

  if (ciclosError && ciclos.length === 0) {
    return <ErrorState error={ciclosError} />
  }

  if (!ciclosLoading && ciclos.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🔄</div>
        <p>No hay ciclos creados todavía.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/app/ciclos')}>
          Crear primer ciclo
        </button>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {anyFetchError && (
        <div className="stale-banner">⚠️ Algunos datos no se pudieron cargar. {anyFetchError.message}</div>
      )}
      <div className="kpi-grid">
        <KPICard label="Ingresos" value={formatCordoba(resumen.ingresosTotal)} icon="💰" tone="green" />
        <KPICard label="Gastos" value={formatCordoba(resumen.gastosTotal)} icon="📉" tone="red" />
        <KPICard
          label="Utilidad neta"
          value={formatCordoba(resumen.utilidadNeta)}
          icon="📈"
          tone={resumen.utilidadNeta >= 0 ? 'green' : 'red'}
        />
        <KPICard label="Producción" value={formatQq(resumen.qqSecos)} icon="🌾" tone="teal" sub={`${formatQq(resumen.qqGranza)} granza`} />
      </div>

      <div className="cost-strip">
        <div className="cost-strip-item">
          <span className="cost-strip-label">Costo / QQ seco</span>
          <span className="cost-strip-value mono">
            {resumen.costoPorQqSeco != null ? formatCordoba(resumen.costoPorQqSeco) : '—'}
          </span>
        </div>
        <div className="cost-strip-item">
          <span className="cost-strip-label">Precio venta prom.</span>
          <span className="cost-strip-value mono">
            {resumen.precioVentaPromedio != null ? formatCordoba(resumen.precioVentaPromedio) : '—'}
          </span>
        </div>
        <div className="cost-strip-item">
          <span className="cost-strip-label">Margen / QQ</span>
          <span className={'cost-strip-value mono ' + (resumen.margenPorQq >= 0 ? 'positive' : 'negative')}>
            {resumen.margenPorQq != null ? formatCordoba(resumen.margenPorQq) : '—'}
          </span>
        </div>
      </div>

      <div className="section-header">
        <h2>Acciones rápidas</h2>
      </div>
      <div className="action-grid">
        {QUICK_ACTIONS.map((action) => (
          <ActionButton key={action.key} icon={action.icon} label={action.label} onClick={() => navigate(action.path)} />
        ))}
      </div>

      <div className="section-header">
        <h2>Viajes activos</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/bascula')}>
          Ver todos
        </button>
      </div>
      {loading ? (
        <div className="loading-wrap">
          <span className="spinner" />
        </div>
      ) : viajesActivos.length === 0 ? (
        <div className="empty-state">
          <div className="icon">⚖️</div>
          <p>No hay viajes activos en este ciclo.</p>
        </div>
      ) : (
        <div className="flow-card-grid">
          {viajesActivos.map(({ bascula, secado, embodegado, turno }) => (
            <FlowCard
              key={bascula.id}
              ticket={bascula.no_ticket}
              productor={bascula.nombre_productor}
              qq={formatQq(bascula.qq_neto, 1)}
              status={{
                bascula: true,
                secado: secado ? (secado.estado === 'seco' ? true : 'active') : false,
                embodegado: embodegado ? true : secado?.estado === 'seco' ? 'active' : false,
                turno: turno ? true : embodegado ? 'active' : false
              }}
              onClick={() => navigate('/app/proceso')}
            />
          ))}
        </div>
      )}

      <div className="section-header">
        <h2>Derivados producidos</h2>
      </div>
      <div className="scroll-x deriv-scroll">
        {DERIVADOS_KEYS.map((key) => (
          <DerivChip key={key} derivado={key} qq={formatQq(resumen.derivadosTotales[key], 1)} />
        ))}
      </div>

      <div className="section-header">
        <h2>Cadena de producción</h2>
      </div>
      <div className="card card-pad">
        <StatRow icon="🌾" label="QQ granza" value={formatQq(resumen.qqGranza)} />
        <StatRow icon="☀️" label="QQ secos" value={formatQq(resumen.qqSecos)} />
        <StatRow icon="📉" label="Merma" value={`${formatQq(resumen.merma)} (${resumen.mermaPct != null ? formatPercent(resumen.mermaPct) : '—'})`} />
        <StatRow icon="🏭" label="Rendimiento AE" value={resumen.rendimientoAE != null ? formatPercent(resumen.rendimientoAE) : '—'} />
      </div>
    </div>
  )
}
