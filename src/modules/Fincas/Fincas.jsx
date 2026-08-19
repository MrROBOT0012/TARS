import { useState } from 'react'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { formatNumber } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'
import OnboardingStepBanner from '../../components/ui/OnboardingStepBanner.jsx'

const EMPTY_FORM = { nombre: '', tipo: '', manzanas: '', notas: '' }

const TIPOS_FINCA = [
  { value: 'propia', label: 'Propia' },
  { value: 'alquilada', label: 'Alquilada' },
  { value: 'financiada', label: 'Financiada a terceros' }
]
const TIPO_LABELS = Object.fromEntries(TIPOS_FINCA.map((t) => [t.value, t.label]))

/**
 * tipo used to be free text (placeholder suggested "propia, alquilada" but
 * nothing enforced it), so older rows may have inconsistent casing (e.g.
 * "Propia" instead of "propia"). Normalize case-insensitively when reading
 * so those rows still resolve to the right <select> option; the value gets
 * corrected to the canonical lowercase form the next time the record is saved.
 */
function normalizarTipo(tipo) {
  const match = TIPOS_FINCA.find((t) => t.value === (tipo ?? '').toLowerCase())
  return match ? match.value : ''
}

export default function Fincas() {
  const {
    data: fincas,
    loading,
    error: fetchError,
    stale,
    refetch
  } = useTable('fincas', { orderBy: { column: 'nombre' } })

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
      tipo: normalizarTipo(row.tipo),
      manzanas: row.manzanas ?? '',
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
        tipo: form.tipo || null,
        manzanas: form.manzanas ? Number(form.manzanas) : null,
        notas: form.notas || null
      }
      if (editing === 'new') {
        await insertRow('fincas', values)
        showSuccess('Finca creada')
      } else {
        await updateRow('fincas', editing, values)
        showSuccess('Finca actualizada')
      }
      markStepDone('finca')
      setEditing(null)
      await refetch()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm(`¿Eliminar la finca "${row.nombre}"?`)) return
    try {
      await deleteRow('fincas', row.id)
      showSuccess('Finca eliminada')
      await refetch()
    } catch (err) {
      handleApiError(err)
    }
  }

  return (
    <div className="fade-in">
      <OnboardingStepBanner step="finca" />
      <div className="section-header">
        <h2>Fincas</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Nueva finca
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner" />
        </div>
      ) : fetchError && fincas.length === 0 ? (
        <ErrorState error={fetchError} onRetry={refetch} />
      ) : (
        <>
        {fetchError && stale && (
          <div className="stale-banner">⚠️ Mostrando datos guardados sin conexión. {fetchError.message}</div>
        )}
        <ListView
          data={fincas}
          emptyMessage="No hay fincas registradas"
          columns={[
            { key: 'nombre', label: 'Nombre' },
            { key: 'tipo', label: 'Tipo', render: (r) => TIPO_LABELS[normalizarTipo(r.tipo)] ?? r.tipo ?? 'Sin tipo' },
            { key: 'manzanas', label: 'Manzanas', mono: true, render: (r) => formatNumber(r.manzanas, 1) },
            { key: 'notas', label: 'Notas' }
          ]}
          renderCard={(r) => (
            <div className="list-card-main">
              <div className="list-card-title">{r.nombre}</div>
              <div className="list-card-sub">
                {TIPO_LABELS[normalizarTipo(r.tipo)] ?? r.tipo ?? 'Sin tipo'} &middot; {formatNumber(r.manzanas, 1)} mz
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
          title={editing === 'new' ? 'Nueva finca' : 'Editar finca'}
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
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="">Seleccionar</option>
                  {TIPOS_FINCA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Manzanas (mz)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.manzanas}
                  onChange={(e) => setForm({ ...form, manzanas: e.target.value })}
                />
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
