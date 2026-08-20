import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import {
  calcularSaldoFinanciamiento,
  calcularValorGranzaEntregada,
  calcularLiquidacionFinanciamiento
} from '../../lib/formulas'
import { formatCordoba, formatQq, formatDate, formatDateInput, todayInput } from '../../lib/formatters'
import ErrorState from '../../components/ui/ErrorState.jsx'
import StatRow from '../../components/ui/StatRow.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'

const TIPOS_MOVIMIENTO = [
  { value: 'adelanto', label: 'Adelanto' },
  { value: 'abono', label: 'Abono' },
  { value: 'aporte', label: 'Aporte propio' }
]
const TIPO_MOVIMIENTO_LABELS = Object.fromEntries(TIPOS_MOVIMIENTO.map((t) => [t.value, t.label]))
const TIPO_MOVIMIENTO_TONE = { adelanto: 'blue', abono: 'green', aporte: 'teal' }

function esFinanciada(finca) {
  return (finca?.tipo ?? '').toLowerCase() === 'financiada'
}

function emptyForm(fincaId, cicloId) {
  return {
    finca_id: fincaId ?? '',
    ciclo_id: cicloId ?? '',
    fecha: todayInput(),
    tipo: 'adelanto',
    monto: '',
    concepto: '',
    notas: ''
  }
}

export default function Financiamiento() {
  const [searchParams, setSearchParams] = useSearchParams()
  const fincaIdParam = searchParams.get('finca')
  const { ciclos } = useCiclo()

  const { data: fincas, loading: lf, error: ef } = useTable('fincas', { orderBy: { column: 'nombre' } })
  const {
    data: financiamientos,
    loading: lm,
    error: em,
    refetch: refetchMovs
  } = useTable('financiamientos', { orderBy: { column: 'fecha', ascending: true } })
  const { data: basculas, loading: lb, error: eb } = useTable('basculas', {})

  const loading = lf || lm || lb
  const anyFetchError = ef ?? em ?? eb

  const { showSuccess } = useToast()
  const handleApiError = useErrorHandler()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fincasFinanciadas = useMemo(() => fincas.filter(esFinanciada), [fincas])
  const fincaActual = fincasFinanciadas.find((f) => f.id === fincaIdParam) ?? null

  function verDetalle(id) {
    setSearchParams({ finca: id })
  }
  function volver() {
    setSearchParams({})
  }

  function openNew() {
    const cicloActivo = ciclos.find((c) => c.estado === 'activo')?.id
    setForm(emptyForm(fincaActual?.id, cicloActivo))
    setFormError('')
    setEditing('new')
  }
  function openEdit(row) {
    setForm({
      finca_id: row.finca_id,
      ciclo_id: row.ciclo_id ?? '',
      fecha: formatDateInput(row.fecha),
      tipo: row.tipo,
      monto: row.monto ?? '',
      concepto: row.concepto ?? '',
      notas: row.notas ?? ''
    })
    setFormError('')
    setEditing(row.id)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const values = {
        finca_id: form.finca_id,
        ciclo_id: form.ciclo_id || null,
        fecha: form.fecha,
        tipo: form.tipo,
        monto: form.monto ? Number(form.monto) : 0,
        concepto: form.concepto || null,
        notas: form.notas || null
      }
      if (editing === 'new') {
        await insertRow('financiamientos', values)
        showSuccess('Movimiento registrado')
      } else {
        await updateRow('financiamientos', editing, values)
        showSuccess('Movimiento actualizado')
      }
      setEditing(null)
      await refetchMovs()
    } catch (err) {
      setFormError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm(`¿Eliminar este movimiento de ${formatCordoba(row.monto)}?`)) return
    try {
      await deleteRow('financiamientos', row.id)
      showSuccess('Movimiento eliminado')
      await refetchMovs()
    } catch (err) {
      handleApiError(err)
    }
  }

  const cicloNombre = (id) => ciclos.find((c) => c.id === id)?.nombre ?? '—'

  if (ef && fincas.length === 0) {
    return <ErrorState error={ef} />
  }
  if (loading) {
    return (
      <div className="loading-wrap">
        <span className="spinner" />
      </div>
    )
  }

  // ---------------------------------------------------------------
  // LIST VIEW — every financiada finca with its current balance
  // ---------------------------------------------------------------
  if (!fincaActual) {
    return (
      <div className="fade-in">
        {anyFetchError && (
          <div className="stale-banner">⚠️ Algunos datos no se pudieron cargar. {anyFetchError.message}</div>
        )}
        <div className="section-header">
          <h2>Financiamiento</h2>
        </div>

        {fincasFinanciadas.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🤝</div>
            <p>
              No hay fincas financiadas todavía. Marca una finca como &quot;Financiada a terceros&quot; en Fincas
              para empezar a registrar adelantos, abonos y aportes.
            </p>
          </div>
        ) : (
          fincasFinanciadas.map((f) => {
            const movs = financiamientos.filter((m) => m.finca_id === f.id)
            const saldo = calcularSaldoFinanciamiento(movs, f)
            const tone = Math.abs(saldo.saldoTotal) < 0.01 ? 'gray' : saldo.saldoTotal > 0 ? 'red' : 'green'
            const etiqueta =
              Math.abs(saldo.saldoTotal) < 0.01
                ? 'Saldado'
                : saldo.saldoTotal > 0
                  ? 'en contra del productor'
                  : 'a favor del productor'
            return (
              <div
                key={f.id}
                className="card card-pad"
                style={{ marginBottom: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
                onClick={() => verDetalle(f.id)}
                role="button"
              >
                <div>
                  <div className="list-card-title">{f.nombre}</div>
                  <div className="list-card-sub">{f.productor_nombre || 'Sin productor asignado'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    className="list-card-value mono"
                    style={{ color: tone === 'red' ? 'var(--red)' : tone === 'green' ? 'var(--green)' : undefined }}
                  >
                    {formatCordoba(Math.abs(saldo.saldoTotal))}
                  </div>
                  <span className={`chip chip-${tone}`}>{etiqueta}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------
  // DETAIL VIEW — one finca's full ledger + settlement
  // ---------------------------------------------------------------
  const movsFinca = financiamientos.filter((m) => m.finca_id === fincaActual.id)
  const saldo = calcularSaldoFinanciamiento(movsFinca, fincaActual)
  const basculasFinca = basculas.filter((b) => b.finca_id === fincaActual.id)
  const granza = calcularValorGranzaEntregada(basculasFinca)
  const liquidacion = calcularLiquidacionFinanciamiento(
    saldo.saldoTotal,
    granza.valor,
    fincaActual.porcentaje_ganancia_productor
  )

  const porCiclo = new Map()
  for (const b of basculasFinca) {
    const key = b.ciclo_id ?? 'sin-ciclo'
    if (!porCiclo.has(key)) porCiclo.set(key, { qq: 0, valor: 0, qqSinPrecio: 0 })
    const acc = porCiclo.get(key)
    const qq = Number(b.qq_neto) || 0
    const precio = Number(b.precio_granza_qq) || 0
    if (precio > 0) {
      acc.qq += qq
      acc.valor += qq * precio
    } else {
      acc.qqSinPrecio += qq
    }
  }

  const hayHistorialGranza = basculasFinca.length > 0

  return (
    <div className="fade-in">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={volver}>
        ← Volver a Financiamiento
      </button>

      <div className="section-header">
        <h2>{fincaActual.nombre}</h2>
      </div>
      <p className="field-hint" style={{ marginTop: -8, marginBottom: 16 }}>
        Productor: {fincaActual.productor_nombre || 'sin nombre registrado'} &middot; Ganancia del productor sobre
        excedente: {fincaActual.porcentaje_ganancia_productor != null ? `${fincaActual.porcentaje_ganancia_productor}%` : '—'}
        {fincaActual.interes_aplica &&
          ` · Interés: ${fincaActual.tasa_interes ?? '—'}% ${fincaActual.tasa_interes_periodo === 'mensual' ? 'mensual' : 'anual'}`}
      </p>

      <div className="section-header">
        <h2>Saldo del financiamiento</h2>
      </div>
      <div className="card card-pad">
        <StatRow icon="💵" label="Saldo principal (adelantos − abonos − aportes)" value={formatCordoba(saldo.saldoPrincipal)} />
        {fincaActual.interes_aplica && (
          <StatRow icon="📈" label="Interés acumulado" value={formatCordoba(saldo.interesAcumulado)} />
        )}
        <StatRow icon="🧮" label="Total financiado (hoy)" value={formatCordoba(saldo.saldoTotal)} />
      </div>

      <div className="section-header">
        <h2>Liquidación</h2>
      </div>
      <div className="card card-pad">
        {!hayHistorialGranza ? (
          <p className="field-hint" style={{ margin: 0 }}>
            Esta finca todavía no tiene viajes de báscula registrados — la liquidación se puede calcular en cuanto
            entregue granza.
          </p>
        ) : (
          <>
            {granza.qqSinPrecio > 0 && (
              <div className="stale-banner" style={{ marginBottom: 12 }}>
                ⚠️ {formatQq(granza.qqSinPrecio, 1)} de granza entregada no tienen precio registrado (viajes con
                origen &quot;Propio&quot; no capturan precio) — esa cantidad no se está contando en el valor de
                granza entregada. Revisa esos viajes en Báscula y márcalos como &quot;Comprado&quot; con su precio
                si corresponden a esta liquidación.
              </div>
            )}
            <StatRow icon="🧮" label="Total financiado" value={formatCordoba(saldo.saldoTotal)} />
            <StatRow
              icon="🌾"
              label="Valor de granza entregada"
              value={`${formatCordoba(granza.valor)} (${formatQq(granza.qqConPrecio, 1)})`}
            />
            {liquidacion.resultado === 'pendiente' ? (
              <StatRow
                icon="📉"
                label="Saldo pendiente (el productor aún debe)"
                value={formatCordoba(liquidacion.saldoPendiente)}
              />
            ) : (
              <>
                <StatRow icon="📈" label="Excedente sobre lo financiado" value={formatCordoba(liquidacion.superavit)} />
                <StatRow
                  icon="🤝"
                  label={`Ganancia del productor (${fincaActual.porcentaje_ganancia_productor ?? 0}%)`}
                  value={formatCordoba(liquidacion.gananciaProductor)}
                />
                <StatRow icon="🏢" label="Queda para la operación" value={formatCordoba(liquidacion.gananciaOperacion)} />
              </>
            )}
          </>
        )}
      </div>

      {porCiclo.size > 0 && (
        <>
          <div className="section-header">
            <h2>Granza entregada por ciclo</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ciclo</th>
                  <th>QQ con precio</th>
                  <th>Valor</th>
                  <th>QQ sin precio</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(porCiclo.entries()).map(([cicloId, v]) => (
                  <tr key={cicloId}>
                    <td>{cicloId === 'sin-ciclo' ? 'Sin ciclo' : cicloNombre(cicloId)}</td>
                    <td className="mono">{formatQq(v.qq, 1)}</td>
                    <td className="mono">{formatCordoba(v.valor)}</td>
                    <td className="mono">{v.qqSinPrecio > 0 ? formatQq(v.qqSinPrecio, 1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="section-header">
        <h2>Movimientos</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Nuevo movimiento
        </button>
      </div>
      {saldo.historial.length === 0 ? (
        <div className="empty-state">
          <p>No hay movimientos registrados para esta finca todavía.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Ciclo</th>
                <th>Monto</th>
                <th>Saldo después</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {saldo.historial.map((m) => (
                <tr key={m.id}>
                  <td>{formatDate(m.fecha)}</td>
                  <td>
                    <span className={`chip chip-${TIPO_MOVIMIENTO_TONE[m.tipo]}`}>{TIPO_MOVIMIENTO_LABELS[m.tipo] ?? m.tipo}</span>
                  </td>
                  <td>{m.concepto || '—'}</td>
                  <td>{cicloNombre(m.ciclo_id)}</td>
                  <td className="mono">{formatCordoba(m.monto)}</td>
                  <td className="mono">{formatCordoba(m.saldoPrincipalDespues)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)}>
                        Editar
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(m)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <FormPanel
          title={editing === 'new' ? 'Nuevo movimiento' : 'Editar movimiento'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Guardar'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Tipo de movimiento</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS_MOVIMIENTO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                {form.tipo === 'adelanto' && 'Dinero que se le adelanta al productor.'}
                {form.tipo === 'abono' && 'Dinero que el productor devuelve.'}
                {form.tipo === 'aporte' && 'Valor que el productor pone de su propio bolsillo, reduce lo financiado.'}
              </span>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
              </div>
              <div className="field">
                <label>Monto (C$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Ciclo (opcional)</label>
              <select value={form.ciclo_id} onChange={(e) => setForm({ ...form, ciclo_id: e.target.value })}>
                <option value="">Sin ciclo específico</option>
                {ciclos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Concepto</label>
              <input
                value={form.concepto}
                onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                placeholder="Ej. alquiler de tierra, insumos, nómina, combustible"
              />
            </div>
            <div className="field">
              <label>Notas</label>
              <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </div>
            {formError && <p className="field-error">{formError}</p>}
          </form>
        </FormPanel>
      )}
    </div>
  )
}
