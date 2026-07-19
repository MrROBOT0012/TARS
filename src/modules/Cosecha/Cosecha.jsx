import { useState } from 'react'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import { formatQq, formatPercent, formatDate, formatDateInput, todayInput } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'

function emptyForm(fincaId) {
  return { fecha: todayInput(), finca_id: fincaId ?? '', qq_cosechados: '', humedad: '', notas: '' }
}

export default function Cosecha() {
  const { selectedCicloId, selectedCiclo, ciclos, error: ciclosError } = useCiclo()
  const { data: fincas } = useTable('fincas', { orderBy: { column: 'nombre' } })
  const {
    data: cosechas,
    loading,
    error: fetchError,
    stale,
    refetch
  } = useTable('cosechas', {
    filters: [['ciclo_id', 'eq', selectedCicloId]],
    orderBy: { column: 'fecha', ascending: false },
    enabled: !!selectedCicloId
  })

  const { showSuccess } = useToast()
  const handleApiError = useErrorHandler()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openNew() {
    setForm(emptyForm(selectedCiclo?.finca_id))
    setEditing('new')
  }

  function openEdit(row) {
    setForm({
      fecha: formatDateInput(row.fecha),
      finca_id: row.finca_id ?? '',
      qq_cosechados: row.qq_cosechados ?? '',
      humedad: row.humedad ?? '',
      notas: row.notas ?? ''
    })
    setEditing(row.id)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const values = {
        fecha: form.fecha,
        finca_id: form.finca_id || null,
        ciclo_id: selectedCicloId,
        qq_cosechados: form.qq_cosechados ? Number(form.qq_cosechados) : 0,
        humedad: form.humedad ? Number(form.humedad) : null,
        notas: form.notas || null
      }
      if (editing === 'new') {
        await insertRow('cosechas', values)
      } else {
        await updateRow('cosechas', editing, values)
      }
      showSuccess('Cosecha guardada')
      setEditing(null)
      await refetch()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm('¿Eliminar este registro de cosecha?')) return
    try {
      await deleteRow('cosechas', row.id)
      showSuccess('Cosecha eliminada')
      await refetch()
    } catch (err) {
      handleApiError(err)
    }
  }

  const fincaNombre = (id) => fincas.find((f) => f.id === id)?.nombre ?? '—'

  if (ciclosError && !ciclos.length) {
    return <ErrorState error={ciclosError} />
  }
  if (!ciclos.length) {
    return <div className="empty-state">Crea un ciclo primero para registrar cosechas.</div>
  }
  if (!selectedCicloId) {
    return <div className="empty-state">Selecciona un ciclo activo para ver sus cosechas.</div>
  }

  return (
    <div className="fade-in">
      <div className="section-header">
        <h2>Cosecha</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Nueva cosecha
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner" />
        </div>
      ) : fetchError && cosechas.length === 0 ? (
        <ErrorState error={fetchError} onRetry={refetch} />
      ) : (
        <>
        {fetchError && stale && (
          <div className="stale-banner">⚠️ Mostrando datos guardados sin conexión. {fetchError.message}</div>
        )}
        <ListView
          data={cosechas}
          emptyMessage="No hay cosechas registradas en este ciclo"
          columns={[
            { key: 'fecha', label: 'Fecha', render: (r) => formatDate(r.fecha) },
            { key: 'finca', label: 'Finca', render: (r) => fincaNombre(r.finca_id) },
            { key: 'qq_cosechados', label: 'QQ cosechados', mono: true, render: (r) => formatQq(r.qq_cosechados, 1) },
            { key: 'humedad', label: 'Humedad', mono: true, render: (r) => (r.humedad != null ? formatPercent(r.humedad) : '—') }
          ]}
          renderCard={(r) => (
            <div className="list-card-main">
              <div className="list-card-title">{fincaNombre(r.finca_id)}</div>
              <div className="list-card-sub">{formatDate(r.fecha)}</div>
              <div className="list-card-value mono" style={{ marginTop: 6 }}>
                {formatQq(r.qq_cosechados, 1)} &middot; {r.humedad != null ? formatPercent(r.humedad) : '—'} humedad
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
          title={editing === 'new' ? 'Nueva cosecha' : 'Editar cosecha'}
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
            <div className="field-row">
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
              </div>
              <div className="field">
                <label>Finca</label>
                <select value={form.finca_id} onChange={(e) => setForm({ ...form, finca_id: e.target.value })} required>
                  <option value="">Seleccionar</option>
                  {fincas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>QQ cosechados</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.qq_cosechados}
                  onChange={(e) => setForm({ ...form, qq_cosechados: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Humedad (%)</label>
                <input type="number" step="0.1" value={form.humedad} onChange={(e) => setForm({ ...form, humedad: e.target.value })} />
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
