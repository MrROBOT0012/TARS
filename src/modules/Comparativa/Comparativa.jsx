import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useTable } from '../../hooks/useData'
import { computePLParaCiclo } from '../../lib/formulas'
import { formatCordoba, formatQq, formatPercent, formatDate, formatDateShort, parseCalendarDate } from '../../lib/formatters'
import StatusChip from '../../components/ui/StatusChip.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import './comparativa.css'

const MAX_SELECCION = 3

// Métricas mostradas en la tabla lado a lado, en orden. `merma` es especial:
// se muestra como "qq (pct%)" usando el campo mermaPct aparte.
const METRICAS = [
  { key: 'ingresosTotal', label: 'Ingresos', formato: 'cordoba' },
  { key: 'gastosOperativos', label: 'Gastos operativos', formato: 'cordoba' },
  { key: 'granzaTotal', label: 'Compra de granza a terceros', formato: 'cordoba' },
  { key: 'utilidadNeta', label: 'Utilidad neta', formato: 'cordoba', resaltar: true },
  { key: 'qqSecos', label: 'Producción (QQ secos)', formato: 'qq' },
  { key: 'merma', label: 'Merma', formato: 'merma' },
  { key: 'rendimientoAE', label: 'Rendimiento AE', formato: 'percent' },
  { key: 'costoPorQqSeco', label: 'Costo / QQ seco', formato: 'cordoba', resaltar: true },
  { key: 'precioVentaPromedio', label: 'Precio venta promedio', formato: 'cordoba' },
  { key: 'margenPorQq', label: 'Margen / QQ', formato: 'cordoba' }
]

// Métricas disponibles para la tendencia — subconjunto simple de valor único
// (la tendencia grafica un solo número a la vez; mezclar córdobas, qq y % en
// una sola línea sería ilegible).
const METRICAS_TENDENCIA = [
  { key: 'utilidadNeta', label: 'Utilidad neta', formato: 'cordoba' },
  { key: 'costoPorQqSeco', label: 'Costo / QQ seco', formato: 'cordoba' },
  { key: 'ingresosTotal', label: 'Ingresos', formato: 'cordoba' },
  { key: 'qqSecos', label: 'Producción (QQ secos)', formato: 'qq' },
  { key: 'rendimientoAE', label: 'Rendimiento AE', formato: 'percent' }
]

function formatearValor(formato, valor) {
  if (valor == null) return '—'
  if (formato === 'cordoba') return formatCordoba(valor)
  if (formato === 'qq') return formatQq(valor)
  if (formato === 'percent') return formatPercent(valor)
  return String(valor)
}

function rangoFechas(ciclo) {
  const inicio = ciclo.inicio ? formatDate(ciclo.inicio) : '—'
  const fin = ciclo.fin ? formatDate(ciclo.fin) : 'en curso'
  return `${inicio} – ${fin}`
}

/** Un ciclo se trata como "en curso" (no final) simplemente por no tener fin,
 *  independientemente de su estado — es la señal real de si sus números
 *  todavía se pueden mover. */
function enCurso(ciclo) {
  return !ciclo.fin
}

function TrendChart({ puntos, formato, label }) {
  const width = 680
  const height = 240
  const padding = { top: 28, right: 20, bottom: 40, left: 16 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const valores = puntos.map((p) => p.valor)
  const minVal = Math.min(0, ...valores)
  const maxVal = Math.max(0, ...valores, minVal + 1)
  const rango = maxVal - minVal || 1

  const x = (i) => (puntos.length > 1 ? padding.left + (i / (puntos.length - 1)) * innerW : padding.left + innerW / 2)
  const y = (v) => padding.top + innerH - ((v - minVal) / rango) * innerH
  const zeroY = y(0)

  const pathD = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`Tendencia de ${label}`}>
      {minVal < 0 && maxVal > 0 && (
        <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
      )}
      <path d={pathD} fill="none" stroke="var(--green)" strokeWidth="2.5" />
      {puntos.map((p, i) => (
        <g key={p.ciclo.id}>
          {enCurso(p.ciclo) ? (
            <circle cx={x(i)} cy={y(p.valor)} r="5" fill="var(--white)" stroke="var(--amber)" strokeWidth="2.5" />
          ) : (
            <circle cx={x(i)} cy={y(p.valor)} r="4.5" fill="var(--green)" />
          )}
          <text x={x(i)} y={y(p.valor) - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">
            {formatearValor(formato, p.valor)}
          </text>
          <text x={x(i)} y={height - 20} textAnchor="middle" fontSize="11" fill="var(--ink3)">
            {formatDateShort(p.ciclo.inicio)}
          </text>
          {enCurso(p.ciclo) && (
            <text x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--amber)" fontWeight="600">
              en curso
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export default function Comparativa() {
  const { ciclos, loading: ciclosLoading, error: ciclosError } = useCiclo()
  const navigate = useNavigate()

  const { data: fincas } = useTable('fincas', { orderBy: { column: 'nombre' } })
  const { data: cosechas, loading: lc, error: ec } = useTable('cosechas', {})
  const { data: gastos, loading: lg, error: eg } = useTable('gastos_campo', {})
  const { data: basculas, loading: lb, error: eb } = useTable('basculas', {})
  const { data: secados, loading: ls, error: es } = useTable('secados', {})
  const { data: embodegados, loading: le, error: ee } = useTable('embodegados', {})
  const { data: turnos, loading: lt, error: et } = useTable('turnos_trillo', {})
  const { data: ventas, loading: lv, error: ev } = useTable('ventas', {})

  const loading = ciclosLoading || lc || lg || lb || ls || le || lt || lv
  const anyFetchError = ec ?? eg ?? eb ?? es ?? ee ?? et ?? ev

  const ciclosOrdenados = useMemo(
    () => [...ciclos].sort((a, b) => parseCalendarDate(a.inicio) - parseCalendarDate(b.inicio)),
    [ciclos]
  )

  const plPorCiclo = useMemo(() => {
    const dataset = { cosechas, gastos, basculas, secados, embodegados, turnos, ventas }
    const map = new Map()
    for (const c of ciclosOrdenados) {
      map.set(c.id, computePLParaCiclo(c.id, dataset))
    }
    return map
  }, [ciclosOrdenados, cosechas, gastos, basculas, secados, embodegados, turnos, ventas])

  const [seleccionados, setSeleccionados] = useState([])
  const [metricaTendencia, setMetricaTendencia] = useState('utilidadNeta')
  const initRef = useRef(false)

  useEffect(() => {
    if (!initRef.current && ciclosOrdenados.length > 0) {
      setSeleccionados(ciclosOrdenados.slice(-MAX_SELECCION).map((c) => c.id))
      initRef.current = true
    }
  }, [ciclosOrdenados])

  function toggleCiclo(id) {
    setSeleccionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_SELECCION) return prev
      return [...prev, id]
    })
  }

  const fincaNombre = (id) => fincas.find((f) => f.id === id)?.nombre ?? '—'

  if (ciclosError && ciclos.length === 0) {
    return <ErrorState error={ciclosError} />
  }
  if (!ciclosLoading && ciclos.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📈</div>
        <p>No hay ciclos creados todavía.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/app/ciclos')}>
          Crear primer ciclo
        </button>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="loading-wrap">
        <span className="spinner" />
      </div>
    )
  }

  const seleccionOrdenada = ciclosOrdenados.filter((c) => seleccionados.includes(c.id))
  const soloUnCiclo = ciclosOrdenados.length === 1
  const metricaActual = METRICAS_TENDENCIA.find((m) => m.key === metricaTendencia) ?? METRICAS_TENDENCIA[0]
  const puntosTendencia = ciclosOrdenados.map((c) => ({ ciclo: c, valor: plPorCiclo.get(c.id)?.[metricaActual.key] ?? 0 }))

  return (
    <div className="fade-in">
      {anyFetchError && (
        <div className="stale-banner">⚠️ Algunos datos no se pudieron cargar. {anyFetchError.message}</div>
      )}

      <div className="section-header">
        <h2>Comparativa de ciclos</h2>
      </div>

      {soloUnCiclo && (
        <div className="stale-banner">
          ℹ️ Solo hay 1 ciclo registrado (&quot;{ciclosOrdenados[0].nombre}&quot;). La comparación —lado a lado y en el
          tiempo— será mucho más útil en cuanto registres más temporadas. Por ahora puedes ver sus números como
          referencia abajo.
        </div>
      )}

      <div className="section-header">
        <h2>Elegir ciclos (hasta {MAX_SELECCION})</h2>
      </div>
      <div className="ciclo-select-list">
        {ciclosOrdenados.map((c) => {
          const checked = seleccionados.includes(c.id)
          const disabled = !checked && seleccionados.length >= MAX_SELECCION
          return (
            <label key={c.id} className={'ciclo-select-item' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '')}>
              <input
                type="checkbox"
                className="ciclo-select-checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggleCiclo(c.id)}
              />
              <div className="ciclo-select-info">
                <div className="ciclo-select-title">
                  {c.nombre}
                  {enCurso(c) && <StatusChip status="en_curso" />}
                </div>
                <div className="ciclo-select-sub">
                  {fincaNombre(c.finca_id)} &middot; {rangoFechas(c)}
                </div>
              </div>
            </label>
          )
        })}
      </div>

      <div className="section-header">
        <h2>Lado a lado</h2>
      </div>
      {seleccionOrdenada.length === 0 ? (
        <div className="empty-state">
          <p>Selecciona al menos un ciclo arriba para comparar.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Métrica</th>
                {seleccionOrdenada.map((c) => (
                  <th key={c.id}>
                    {c.nombre}
                    {enCurso(c) && (
                      <>
                        {' '}
                        <StatusChip status="en_curso" />
                      </>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICAS.map((m) => (
                <tr key={m.key}>
                  <td>{m.label}</td>
                  {seleccionOrdenada.map((c) => {
                    const pl = plPorCiclo.get(c.id)
                    const valor =
                      m.formato === 'merma'
                        ? `${formatQq(pl.merma)} (${pl.mermaPct != null ? formatPercent(pl.mermaPct) : '—'})`
                        : formatearValor(m.formato, pl[m.key])
                    return (
                      <td key={c.id} className={'mono' + (m.resaltar ? ' list-card-value' : '')}>
                        {valor}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-header">
        <h2>Tendencia en el tiempo</h2>
      </div>
      {ciclosOrdenados.length < 2 ? (
        <div className="empty-state">
          <div className="icon">📈</div>
          <p>
            La tendencia necesita al menos 2 ciclos con fecha de inicio para trazar una línea. Registra otra
            temporada y vuelve aquí para ver la evolución.
          </p>
        </div>
      ) : (
        <>
          <div className="scroll-x metrica-toggle-scroll">
            {METRICAS_TENDENCIA.map((m) => (
              <button
                key={m.key}
                className={'chip metrica-toggle' + (m.key === metricaTendencia ? ' chip-green' : ' chip-gray')}
                onClick={() => setMetricaTendencia(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="card card-pad">
            <TrendChart puntos={puntosTendencia} formato={metricaActual.formato} label={metricaActual.label} />
          </div>
        </>
      )}
    </div>
  )
}
