import { useEffect, useMemo, useState } from 'react'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { confirmarFechaFueraDeCiclo } from '../../lib/cicloValidation'
import { formatCordoba, formatQq, formatDate, formatDateInput, todayInput } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'
import OnboardingStepBanner from '../../components/ui/OnboardingStepBanner.jsx'

function emptyForm(fincaId) {
  return {
    bascula_id: '',
    fecha: todayInput(),
    qq_embodegados: '',
    sacos: '',
    precio_saco: '',
    bodega: '',
    sacos_pendientes: '',
    finca_id: fincaId ?? '',
    notas: ''
  }
}

export default function Embodegado({ autoOpenNew }) {
  const { selectedCicloId, selectedCiclo, ciclos, error: ciclosError } = useCiclo()
  const cicloFilter = [['ciclo_id', 'eq', selectedCicloId]]
  const enabled = !!selectedCicloId

  const { data: basculas } = useTable('basculas', { filters: cicloFilter, enabled })
  const { data: secados } = useTable('secados', { filters: cicloFilter, enabled })
  const {
    data: embodegados,
    loading,
    error: fetchError,
    stale,
    refetch
  } = useTable('embodegados', {
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

  const usedBasculaIds = useMemo(() => {
    const used = new Set()
    embodegados.forEach((e) => {
      if (editing !== 'new' && e.id === editing) return
      used.add(String(e.bascula_id))
    })
    return used
  }, [embodegados, editing])

  const availableBasculas = basculas.filter(
    (b) => !usedBasculaIds.has(String(b.id)) || String(b.id) === String(form.bascula_id)
  )

  function openNew() {
    setForm(emptyForm(selectedCiclo?.finca_id))
    setEditing('new')
  }

  function openEdit(row) {
    setForm({
      bascula_id: row.bascula_id ?? '',
      fecha: formatDateInput(row.fecha),
      qq_embodegados: row.qq_embodegados ?? '',
      sacos: row.sacos ?? '',
      precio_saco: row.precio_saco ?? '',
      bodega: row.bodega ?? '',
      sacos_pendientes: row.sacos_pendientes ?? '',
      finca_id: row.finca_id ?? '',
      notas: row.notas ?? ''
    })
    setEditing(row.id)
  }

  function handleBasculaChange(id) {
    const b = basculas.find((x) => String(x.id) === String(id))
    const secadosDelViaje = secados.filter((s) => String(s.bascula_id) === String(id))
    const secado =
      secadosDelViaje.find((s) => s.estado === 'seco') ??
      secadosDelViaje.find((s) => s.estado === 'preseco') ??
      secadosDelViaje[0]
    setForm({
      ...form,
      bascula_id: id,
      finca_id: b?.finca_id ?? form.finca_id,
      qq_embodegados: secado?.qq_seco ?? ''
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!confirmarFechaFueraDeCiclo(form.fecha, selectedCiclo)) return
    setSaving(true)
    setError('')
    try {
      const values = {
        bascula_id: form.bascula_id || null,
        finca_id: form.finca_id || null,
        ciclo_id: selectedCicloId,
        fecha: form.fecha,
        qq_embodegados: form.qq_embodegados ? Number(form.qq_embodegados) : 0,
        sacos: form.sacos ? Number(form.sacos) : 0,
        precio_saco: form.precio_saco ? Number(form.precio_saco) : 0,
        bodega: form.bodega || null,
        sacos_pendientes: form.sacos_pendientes ? Number(form.sacos_pendientes) : 0,
        notas: form.notas || null
      }
      if (editing === 'new') {
        await insertRow('embodegados', values)
      } else {
        await updateRow('embodegados', editing, values)
      }
      showSuccess('Embodegado guardado')
      markStepDone('embodegado')
      setEditing(null)
      await refetch()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm('¿Eliminar este registro de embodegado?')) return
    try {
      await deleteRow('embodegados', row.id)
      showSuccess('Embodegado eliminado')
      await refetch()
    } catch (err) {
      handleApiError(err)
    }
  }

  const basculaOf = (id) => basculas.find((b) => String(b.id) === String(id))
  const ticketLabel = (id) => {
    const b = basculaOf(id)
    if (!b) return '#—'
    return `#${b.no_ticket}${b.nombre_productor ? ` · ${b.nombre_productor}` : ''}`
  }
  const costoSacos = (Number(form.precio_saco) || 0) * (Number(form.sacos) || 0)

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
      <OnboardingStepBanner step="embodegado" />
      <div className="section-header">
        <h2>Embodegado</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Nuevo embodegado
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner" />
        </div>
      ) : fetchError && embodegados.length === 0 ? (
        <ErrorState error={fetchError} onRetry={refetch} />
      ) : (
        <>
        {fetchError && stale && (
          <div className="stale-banner">⚠️ Mostrando datos guardados sin conexión. {fetchError.message}</div>
        )}
        <ListView
          data={embodegados}
          emptyMessage="No hay registros de embodegado en este ciclo"
          columns={[
            { key: 'ticket', label: 'Ticket', mono: true, render: (r) => ticketLabel(r.bascula_id) },
            { key: 'fecha', label: 'Fecha', render: (r) => formatDate(r.fecha) },
            { key: 'qq_embodegados', label: 'QQ embodegados', mono: true, render: (r) => formatQq(r.qq_embodegados, 1) },
            { key: 'sacos', label: 'Sacos', mono: true },
            { key: 'bodega', label: 'Bodega' },
            { key: 'sacos_pendientes', label: 'Sacos pend.', mono: true }
          ]}
          renderCard={(r) => (
            <div className="list-card-main">
              <div className="list-card-title mono">{ticketLabel(r.bascula_id)}</div>
              <div className="list-card-sub">
                {formatDate(r.fecha)} &middot; {r.bodega || 'sin bodega'}
              </div>
              <div className="list-card-value mono" style={{ marginTop: 6 }}>
                {formatQq(r.qq_embodegados, 1)} &middot; {r.sacos} sacos
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
          title={editing === 'new' ? 'Nuevo embodegado' : 'Editar embodegado'}
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
                {availableBasculas.map((b) => (
                  <option key={b.id} value={b.id}>
                    #{b.no_ticket} &middot; {b.nombre_productor}
                  </option>
                ))}
              </select>
              {availableBasculas.length === 0 && (
                <span className="field-hint">No hay viajes disponibles para embodegar</span>
              )}
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </div>
            <div className="field">
              <label>QQ embodegados</label>
              <input
                type="number"
                step="0.01"
                value={form.qq_embodegados}
                onChange={(e) => setForm({ ...form, qq_embodegados: e.target.value })}
                required
              />
              <span className="field-hint">Prellenado desde el secado del viaje seleccionado</span>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Sacos</label>
                <input type="number" value={form.sacos} onChange={(e) => setForm({ ...form, sacos: e.target.value })} />
              </div>
              <div className="field">
                <label>Precio / saco (C$)</label>
                <input type="number" step="0.01" value={form.precio_saco} onChange={(e) => setForm({ ...form, precio_saco: e.target.value })} />
              </div>
            </div>
            <span className="field-hint" style={{ display: 'block', marginTop: -8, marginBottom: 16 }}>
              Costo total de sacos: {formatCordoba(costoSacos)}
            </span>
            <div className="field-row">
              <div className="field">
                <label>Bodega</label>
                <input value={form.bodega} onChange={(e) => setForm({ ...form, bodega: e.target.value })} />
              </div>
              <div className="field">
                <label>Sacos pendientes</label>
                <input type="number" value={form.sacos_pendientes} onChange={(e) => setForm({ ...form, sacos_pendientes: e.target.value })} />
              </div>
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
