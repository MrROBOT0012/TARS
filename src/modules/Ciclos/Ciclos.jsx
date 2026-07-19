import { useState } from 'react'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { formatDate, formatDateInput } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'
import OnboardingStepBanner from '../../components/ui/OnboardingStepBanner.jsx'

const EMPTY_FORM = { nombre: '', finca_id: '', inicio: '', fin: '', estado: 'activo', notas: '' }

export default function Ciclos() {
  const { data: fincas } = useTable('fincas', { orderBy: { column: 'nombre' } })
  const {
    data: ciclos,
    loading,
    error: fetchError,
    stale,
    refetch
  } = useTable('ciclos', { orderBy: { column: 'inicio', ascending: false } })
  const { refetch: refetchCiclosGlobal } = useCiclo()
  const { showSuccess } = useToast()
  const handleApiError = useErrorHandler()
  const { markStepDone } = useOnboarding()

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openNew() {
    setForm(EMPTY_FORM)
    setEditing('new')
  }

  function openEdit(row) {
    setForm({
      nombre: row.nombre ?? '',
      finca_id: row.finca_id ?? '',
      inicio: formatDateInput(row.inicio),
      fin: formatDateInput(row.fin),
      estado: row.estado ?? 'activo',
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
        nombre: form.nombre,
        finca_id: form.finca_id || null,
        inicio: form.inicio || null,
        fin: form.fin || null,
        estado: form.estado,
        notas: form.notas || null
      }
      if (editing === 'new') {
        await insertRow('ciclos', values)
      } else {
        await updateRow('ciclos', editing, values)
      }
      showSuccess('Ciclo guardado')
      markStepDone('ciclo')
      setEditing(null)
      await refetch()
      await refetchCiclosGlobal()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm(`¿Eliminar el ciclo "${row.nombre}"?`)) return
    try {
      await deleteRow('ciclos', row.id)
      showSuccess('Ciclo eliminado')
      await refetch()
      await refetchCiclosGlobal()
    } catch (err) {
      handleApiError(err)
    }
  }

  const fincaNombre = (id) => fincas.find((f) => f.id === id)?.nombre ?? '—'

  return (
    <div className="fade-in">
      <OnboardingStepBanner step="ciclo" />
      <div className="section-header">
        <h2>Ciclos</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Nuevo ciclo
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner" />
        </div>
      ) : fetchError && ciclos.length === 0 ? (
        <ErrorState error={fetchError} onRetry={refetch} />
      ) : (
        <>
        {fetchError && stale && (
          <div className="stale-banner">⚠️ Mostrando datos guardados sin conexión. {fetchError.message}</div>
        )}
        <ListView
          data={ciclos}
          emptyMessage="No hay ciclos registrados"
          columns={[
            { key: 'nombre', label: 'Nombre' },
            { key: 'finca', label: 'Finca', render: (r) => fincaNombre(r.finca_id) },
            { key: 'inicio', label: 'Inicio', render: (r) => formatDate(r.inicio) },
            { key: 'fin', label: 'Fin', render: (r) => formatDate(r.fin) },
            { key: 'estado', label: 'Estado', render: (r) => <StatusChip status={r.estado} /> }
          ]}
          renderCard={(r) => (
            <div className="list-card-main">
              <div className="list-card-title">{r.nombre}</div>
              <div className="list-card-sub">
                {fincaNombre(r.finca_id)} &middot; {formatDate(r.inicio)} - {formatDate(r.fin) || 'en curso'}
              </div>
              <div style={{ marginTop: 6 }}>
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
          title={editing === 'new' ? 'Nuevo ciclo' : 'Editar ciclo'}
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
              <label>Nombre del ciclo</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Invierno 2026"
                required
              />
            </div>
            <div className="field">
              <label>Finca</label>
              <select value={form.finca_id} onChange={(e) => setForm({ ...form, finca_id: e.target.value })} required>
                <option value="">Seleccionar finca</option>
                {fincas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Inicio</label>
                <input type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} required />
              </div>
              <div className="field">
                <label>Fin</label>
                <input type="date" value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="activo">Activo</option>
                <option value="cerrado">Cerrado</option>
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
