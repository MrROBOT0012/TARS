import { useEffect, useState } from 'react'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { calcularQqSeco, calcularMerma, HUMEDAD_OBJETIVO_ESTANDAR } from '../../lib/formulas'
import { formatQq, formatDate, formatDateInput, todayInput } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'
import OnboardingStepBanner from '../../components/ui/OnboardingStepBanner.jsx'

function emptyForm(fincaId) {
  return {
    bascula_id: '',
    fecha: todayInput(),
    metodo: 'patio',
    numero: '',
    tipo_patio: '',
    precio_descargue: '',
    precio_secado: '',
    de_preseco: false,
    humedad_entrada: '',
    humedad_objetivo: HUMEDAD_OBJETIVO_ESTANDAR,
    qq_seco: '',
    estado: 'en_proceso',
    finca_id: fincaId ?? '',
    notas: ''
  }
}

export default function Secado({ autoOpenNew }) {
  const { selectedCicloId, selectedCiclo, ciclos, error: ciclosError } = useCiclo()
  const cicloFilter = [['ciclo_id', 'eq', selectedCicloId]]
  const enabled = !!selectedCicloId

  const { data: basculas } = useTable('basculas', { filters: cicloFilter, enabled })
  const {
    data: secados,
    loading,
    error: fetchError,
    stale,
    refetch
  } = useTable('secados', {
    filters: cicloFilter,
    orderBy: { column: 'fecha', ascending: false },
    enabled
  })

  const { showSuccess } = useToast()
  const handleApiError = useErrorHandler()
  const { markStepDone } = useOnboarding()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (autoOpenNew && enabled) openNew()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenNew, enabled])

  function openNew() {
    setForm(emptyForm(selectedCiclo?.finca_id))
    setEditing('new')
  }

  function openEdit(row) {
    setForm({
      bascula_id: row.bascula_id ?? '',
      fecha: formatDateInput(row.fecha),
      metodo: row.metodo ?? 'patio',
      numero: row.numero ?? '',
      tipo_patio: row.tipo_patio ?? '',
      precio_descargue: row.precio_descargue ?? '',
      precio_secado: row.precio_secado ?? '',
      de_preseco: !!row.de_preseco,
      humedad_entrada: row.humedad_entrada ?? '',
      humedad_objetivo: row.humedad_objetivo ?? HUMEDAD_OBJETIVO_ESTANDAR,
      qq_seco: row.qq_seco ?? '',
      estado: row.estado ?? 'en_proceso',
      finca_id: row.finca_id ?? '',
      notas: row.notas ?? ''
    })
    setEditing(row.id)
  }

  const basculaSeleccionada = basculas.find((b) => b.id === Number(form.bascula_id))

  function updateHumedad(field, value) {
    const next = { ...form, [field]: value }
    const qqNeto = basculaSeleccionada?.qq_neto
    if (qqNeto != null && next.humedad_entrada !== '' && next.humedad_objetivo !== '') {
      const qqSeco = calcularQqSeco(qqNeto, Number(next.humedad_entrada), Number(next.humedad_objetivo))
      if (qqSeco != null) next.qq_seco = qqSeco.toFixed(2)
    }
    setForm(next)
  }

  function handleBasculaChange(id) {
    const b = basculas.find((x) => x.id === Number(id))
    setForm({ ...form, bascula_id: id, finca_id: b?.finca_id ?? form.finca_id })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const values = {
        bascula_id: form.bascula_id ? Number(form.bascula_id) : null,
        finca_id: form.finca_id || null,
        ciclo_id: selectedCicloId,
        fecha: form.fecha,
        metodo: form.metodo,
        numero: form.numero || null,
        tipo_patio: form.metodo === 'patio' ? form.tipo_patio || null : null,
        precio_descargue: form.precio_descargue ? Number(form.precio_descargue) : 0,
        precio_secado: form.precio_secado ? Number(form.precio_secado) : 0,
        de_preseco: form.de_preseco,
        humedad_entrada: form.humedad_entrada ? Number(form.humedad_entrada) : null,
        humedad_objetivo: form.humedad_objetivo ? Number(form.humedad_objetivo) : HUMEDAD_OBJETIVO_ESTANDAR,
        qq_seco: form.qq_seco ? Number(form.qq_seco) : 0,
        estado: form.estado,
        notas: form.notas || null
      }
      if (editing === 'new') {
        await insertRow('secados', values)
      } else {
        await updateRow('secados', editing, values)
      }
      showSuccess('Secado guardado')
      markStepDone('secado')
      setEditing(null)
      await refetch()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm('¿Eliminar este registro de secado?')) return
    try {
      await deleteRow('secados', row.id)
      showSuccess('Secado eliminado')
      await refetch()
    } catch (err) {
      handleApiError(err)
    }
  }

  const ticketOf = (id) => basculas.find((b) => b.id === id)?.no_ticket ?? '—'

  if (ciclosError && !ciclos.length) {
    return <ErrorState error={ciclosError} />
  }
  if (!ciclos.length) {
    return <div className="empty-state">Crea un ciclo primero.</div>
  }
  if (!selectedCicloId) {
    return <div className="empty-state">Selecciona un ciclo activo.</div>
  }

  return (
    <div>
      <OnboardingStepBanner step="secado" />
      <div className="section-header">
        <h2>Secado</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Nuevo secado
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner" />
        </div>
      ) : fetchError && secados.length === 0 ? (
        <ErrorState error={fetchError} onRetry={refetch} />
      ) : (
        <>
        {fetchError && stale && (
          <div className="stale-banner">⚠️ Mostrando datos guardados sin conexión. {fetchError.message}</div>
        )}
        <ListView
          data={secados}
          emptyMessage="No hay registros de secado en este ciclo"
          columns={[
            { key: 'ticket', label: 'Ticket', mono: true, render: (r) => `#${ticketOf(r.bascula_id)}` },
            { key: 'fecha', label: 'Fecha', render: (r) => formatDate(r.fecha) },
            { key: 'metodo', label: 'Método' },
            { key: 'humedad_entrada', label: 'Hum. entrada', mono: true, render: (r) => (r.humedad_entrada != null ? `${r.humedad_entrada}%` : '—') },
            { key: 'qq_seco', label: 'QQ seco', mono: true, render: (r) => formatQq(r.qq_seco, 1) },
            { key: 'estado', label: 'Estado', render: (r) => <StatusChip status={r.estado} /> }
          ]}
          renderCard={(r) => (
            <div className="list-card-main">
              <div className="list-card-title mono">#{ticketOf(r.bascula_id)}</div>
              <div className="list-card-sub">
                {formatDate(r.fecha)} &middot; {r.metodo}
                {r.de_preseco ? ' · continúa preseco' : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span className="list-card-value mono">{formatQq(r.qq_seco, 1)}</span>
                <StatusChip status={r.estado} />
              </div>
            </div>
          )}
          actions={(r) => (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>
                Editar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r)}>
                Eliminar
              </button>
            </>
          )}
        />
        </>
      )}

      {editing && (
        <FormPanel
          title={editing === 'new' ? 'Nuevo secado' : 'Editar secado'}
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
              <label>Viaje (ticket de báscula)</label>
              <select value={form.bascula_id} onChange={(e) => handleBasculaChange(e.target.value)} required>
                <option value="">Seleccionar viaje</option>
                {basculas.map((b) => (
                  <option key={b.id} value={b.id}>
                    #{b.no_ticket} &middot; {b.nombre_productor} &middot; {formatQq(b.qq_neto, 1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
              </div>
              <div className="field">
                <label>Método</label>
                <select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })}>
                  <option value="patio">Patio</option>
                  <option value="secadora">Secadora</option>
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Número (patio/secadora)</label>
                <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              </div>
              {form.metodo === 'patio' && (
                <div className="field">
                  <label>Tipo de patio</label>
                  <input value={form.tipo_patio} onChange={(e) => setForm({ ...form, tipo_patio: e.target.value })} placeholder="Cemento, tierra..." />
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              <input type="checkbox" checked={form.de_preseco} onChange={(e) => setForm({ ...form, de_preseco: e.target.checked })} />
              Continúa de un preseco anterior
            </label>

            <div className="field-row">
              <div className="field">
                <label>Humedad entrada (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.humedad_entrada}
                  onChange={(e) => updateHumedad('humedad_entrada', e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Humedad objetivo (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.humedad_objetivo}
                  onChange={(e) => updateHumedad('humedad_objetivo', e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>QQ seco (calculado por merma, ajustable)</label>
              <input type="number" step="0.01" value={form.qq_seco} onChange={(e) => setForm({ ...form, qq_seco: e.target.value })} required />
              {basculaSeleccionada && form.qq_seco && (
                <span className="field-hint">
                  Merma: {formatQq(calcularMerma(basculaSeleccionada.qq_neto, Number(form.qq_seco)), 1)}
                </span>
              )}
            </div>

            <div className="field-row">
              <div className="field">
                <label>Precio descargue (C$/qq)</label>
                <input type="number" step="0.01" value={form.precio_descargue} onChange={(e) => setForm({ ...form, precio_descargue: e.target.value })} />
              </div>
              <div className="field">
                <label>Precio secado (C$/qq)</label>
                <input type="number" step="0.01" value={form.precio_secado} onChange={(e) => setForm({ ...form, precio_secado: e.target.value })} />
              </div>
            </div>

            <div className="field">
              <label>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="en_proceso">En proceso</option>
                <option value="preseco">Preseco</option>
                <option value="seco">Seco</option>
              </select>
            </div>

            <div className="field">
              <label>Notas</label>
              <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </div>
            {error && <p className="field-error">{error}</p>}
          </form>
        </FormPanel>
      )}
    </div>
  )
}
