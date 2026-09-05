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
  calcularMerma,
  secadosFinalizados,
  calcularQqVendidos,
  calcularPctProduccionVendida,
  mensajeDivergenciaMargen
} from '../../lib/formulas'
import { fechaFueraDeCiclo, rangoCicloTexto } from '../../lib/cicloValidation'
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
  const { selectedCicloId, selectedCiclo, loading: ciclosLoading, error: ciclosError, ciclos } = useCiclo()
  const navigate = useNavigate()

  const enabled = !!selectedCicloId
  const cicloFilter = [['ciclo_id', 'eq', selectedCicloId]]

  const { data: gastos, loading: lg, error: eg } = useTable('gastos_campo', { filters: cicloFilter, enabled })
  const { data: basculas, loading: lb, error: eb } = useTable('basculas', {
    filters: cicloFilter,
    orderBy: { column: 'fecha', ascending: false },
    enabled
  })
  const { data: secados, loading: ls, error: es } = useTable('secados', { filters: cicloFilter, enabled })
  const { data: embodegados, loading: le, error: ee } = useTable('embodegados', { filters: cicloFilter, enabled })
  const { data: turnos, loading: lt, error: et } = useTable('turnos_trillo', { filters: cicloFilter, enabled })
  const { data: ventas, loading: lv, error: ev } = useTable('ventas', { filters: cicloFilter, enabled })

  const loading = ciclosLoading || (enabled && (lg || lb || ls || le || lt || lv))
  const anyFetchError = eg ?? eb ?? es ?? ee ?? et ?? ev

  const resumen = useMemo(() => {
    // Turnos en estado 'parcial' (molienda incompleta) no cuentan en ningún
    // total financiero ni de derivados hasta que pasan a 'completado'.
    const turnosCompletados = turnos.filter((t) => t.estado !== 'parcial')

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
    const trilladoTotal = turnosCompletados.reduce(
      (sum, t) => sum + (Number(t.precio_trillado_qq) || 0) * (Number(t.qq_totales) || 0) + (Number(t.costo_llenado_pila) || 0),
      0
    )

    // "Gastos operativos" es todo el costo de operar el ciclo; "Compra de
    // granza a terceros" es dinero gastado comprando materia prima de otros
    // productores (solo aplica a viajes origen_viaje === 'comprado'). Se
    // muestran por separado en la UI, pero Utilidad neta usa la suma de
    // ambos — igual que antes.
    const gastosOperativos = gastosCampoTotal + fleteTotal + secadoTotal + embodegadoTotal + trilladoTotal
    const compraGranzaTotal = granzaTotal
    const gastosTotal = gastosOperativos + compraGranzaTotal
    const ingresosTotal = ventas.reduce((sum, v) => sum + (Number(v.qq_vendidos) || 0) * (Number(v.precio_qq) || 0), 0)
    const utilidadNeta = ingresosTotal - gastosTotal

    const qqGranza = sumar(basculas, 'qq_neto')
    // Solo secados en estado 'seco' cuentan como producción terminada — un
    // lote 'en_proceso' o 'preseco' todavía no mueve estos números.
    const qqSecos = sumar(secadosFinalizados(secados), 'qq_seco')
    const merma = calcularMerma(qqGranza, qqSecos)
    const mermaPct = qqGranza ? (merma / qqGranza) * 100 : null

    const derivadosTotales = DERIVADOS_KEYS.reduce((acc, key) => {
      acc[key] = turnosCompletados.reduce((sum, t) => sum + (Number(t.derivados?.[key]) || 0), 0)
      return acc
    }, {})
    const qqArrozEntero = derivadosTotales.arroz_entero || 0
    const rendimientoAE = calcularRendimientoAE(qqArrozEntero, qqSecos)

    const costoPorQqSeco = calcularCostoPorQq(gastosTotal, qqSecos)
    const precioVentaPromedio = calcularPrecioVentaPromedio(ventas)
    const margenPorQq = calcularMargenPorQq(precioVentaPromedio, costoPorQqSeco)
    const qqVendidos = calcularQqVendidos(ventas)
    const pctProduccionVendida = calcularPctProduccionVendida(qqVendidos, qqSecos)

    return {
      gastosOperativos,
      compraGranzaTotal,
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
      margenPorQq,
      qqVendidos,
      pctProduccionVendida
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

  const fechasFueraDeRango = useMemo(() => {
    if (!selectedCiclo) return { count: 0, tablas: [] }
    const revisar = [
      [gastos, 'Gastos de campo'],
      [basculas, 'Básculas'],
      [secados, 'Secados'],
      [embodegados, 'Embodegados'],
      [turnos, 'Turnos de trillo'],
      [ventas, 'Ventas']
    ]
    let count = 0
    const tablas = []
    for (const [rows, label] of revisar) {
      const fuera = rows.filter((r) => fechaFueraDeCiclo(r.fecha, selectedCiclo)).length
      if (fuera > 0) {
        count += fuera
        tablas.push(label)
      }
    }
    return { count, tablas }
  }, [gastos, basculas, secados, embodegados, turnos, ventas, selectedCiclo])

  // Cuántas fincas distintas tienen actividad real en este ciclo. La
  // mayoría de ciclos hoy son de una sola finca, así que el desglose por
  // finca no vale la pena mostrarlo aquí salvo que realmente haya más de
  // una — para eso está la vista completa en Reportes.
  const fincasEnCicloCount = useMemo(() => {
    const claves = new Set()
    for (const rows of [gastos, basculas, secados, embodegados, turnos, ventas]) {
      for (const r of rows) claves.add(r.finca_id ?? null)
    }
    return claves.size
  }, [gastos, basculas, secados, embodegados, turnos, ventas])

  const pendientes = useMemo(() => {
    const basculaIdsConSecado = new Set(secados.map((s) => String(s.bascula_id)))
    const pendientesSecado = basculas.filter((b) => !basculaIdsConSecado.has(String(b.id)))

    const basculaIdsEnTurno = new Set(turnos.flatMap((t) => (Array.isArray(t.bascula_ids) ? t.bascula_ids : []).map(String)))
    const pendientesTrillar = embodegados.filter((e) => !basculaIdsEnTurno.has(String(e.bascula_id)))

    const basculaIdsConEmbodegado = new Set(embodegados.map((e) => String(e.bascula_id)))
    const pendientesEmbodegar = secados.filter(
      (s) => s.estado === 'seco' && !basculaIdsConEmbodegado.has(String(s.bascula_id))
    )

    return {
      secado: { count: pendientesSecado.length, qq: sumar(pendientesSecado, 'qq_neto') },
      trillar: { count: pendientesTrillar.length, qq: sumar(pendientesTrillar, 'qq_embodegados') },
      embodegar: { count: pendientesEmbodegar.length, qq: sumar(pendientesEmbodegar, 'qq_seco') }
    }
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

  const margenDivergenteMsg = mensajeDivergenciaMargen(resumen.utilidadNeta, resumen.margenPorQq)

  return (
    <div className="fade-in">
      {anyFetchError && (
        <div className="stale-banner">⚠️ Algunos datos no se pudieron cargar. {anyFetchError.message}</div>
      )}
      {fechasFueraDeRango.count > 0 && (
        <div className="stale-banner">
          ⚠️ {fechasFueraDeRango.count} registro{fechasFueraDeRango.count === 1 ? '' : 's'} ({fechasFueraDeRango.tablas.join(', ')})
          con fecha fuera del rango del ciclo ({rangoCicloTexto(selectedCiclo)}) — los totales pueden incluir datos mal asignados.
        </div>
      )}
      <div className="kpi-grid">
        <KPICard label="Ingresos" value={formatCordoba(resumen.ingresosTotal)} icon="💰" tone="green" />
        <KPICard
          label="Utilidad neta"
          value={formatCordoba(resumen.utilidadNeta)}
          icon="📈"
          tone={resumen.utilidadNeta >= 0 ? 'green' : 'red'}
        />
        <KPICard label="Producción" value={formatQq(resumen.qqSecos)} icon="🌾" tone="teal" sub={`${formatQq(resumen.qqGranza)} granza`} />
      </div>

      {fincasEnCicloCount > 1 && (
        <div className="stale-banner">
          ℹ️ Este ciclo tiene actividad en {fincasEnCicloCount} fincas distintas. Estos números son el total combinado —
          {' '}
          <button
            onClick={() => navigate('/app/reportes')}
            style={{
              font: 'inherit',
              color: 'inherit',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer'
            }}
          >
            ver el desglose por finca en Reportes
          </button>
          .
        </div>
      )}
      <div className="section-header">
        <h2>Desglose de gastos</h2>
      </div>
      <div className="card card-pad">
        <StatRow icon="🧑‍🌾" label="Gastos operativos" value={formatCordoba(resumen.gastosOperativos)} />
        <StatRow icon="🌾" label="Compra de granza a terceros" value={formatCordoba(resumen.compraGranzaTotal)} />
        <StatRow icon="📉" label="Total gastos" value={formatCordoba(resumen.gastosTotal)} />
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
          <span className="cost-strip-label">Margen / QQ vendido</span>
          <span className={'cost-strip-value mono ' + (resumen.margenPorQq >= 0 ? 'positive' : 'negative')}>
            {resumen.margenPorQq != null ? formatCordoba(resumen.margenPorQq) : '—'}
          </span>
          {resumen.pctProduccionVendida != null && (
            <span className="cost-strip-caption">sobre {formatPercent(resumen.pctProduccionVendida)} de la producción vendida</span>
          )}
        </div>
      </div>
      {margenDivergenteMsg && <div className="info-banner">ℹ️ {margenDivergenteMsg}</div>}

      <div className="section-header">
        <h2>Acciones rápidas</h2>
      </div>
      <div className="action-grid">
        {QUICK_ACTIONS.map((action) => (
          <ActionButton key={action.key} icon={action.icon} label={action.label} onClick={() => navigate(action.path)} />
        ))}
      </div>

      <div className="section-header">
        <h2>Pendientes de hoy</h2>
      </div>
      <div className="card card-pad">
        <StatRow
          icon="☀️"
          label="Pendientes de secado"
          value={`${pendientes.secado.count} viaje${pendientes.secado.count === 1 ? '' : 's'} · ${formatQq(pendientes.secado.qq, 1)}`}
        />
        <StatRow
          icon="🏭"
          label="Pendientes de trillar"
          value={`${pendientes.trillar.count} lote${pendientes.trillar.count === 1 ? '' : 's'} · ${formatQq(pendientes.trillar.qq, 1)}`}
        />
        <StatRow
          icon="📦"
          label="Pendientes de embodegar"
          value={`${pendientes.embodegar.count} lote${pendientes.embodegar.count === 1 ? '' : 's'} · ${formatQq(pendientes.embodegar.qq, 1)}`}
        />
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
