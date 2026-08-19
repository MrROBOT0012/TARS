import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { confirmarFechaFueraDeCiclo } from '../../lib/cicloValidation'
import { formatCordoba, formatDate, formatDateInput, todayInput } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'
import OnboardingStepBanner from '../../components/ui/OnboardingStepBanner.jsx'

const CATEGORIAS = ['Siembra', 'Fertilizante', 'Fumigación', 'Riego', 'Mano de obra', 'Combustible', 'Maquinaria', 'Gastos de beneficio', 'Otro']

function emptyForm(fincaId) {
  return { fecha: todayInput(), finca_id: fincaId ?? '', categoria: '', descripcion: '', monto: '', notas: '' }
}

export default function Campo() {
  const [searchParams] = useSearchParams()
  const autoOpenNew = searchParams.get('new') === '1'
  const { selectedCicloId, selectedCiclo, ciclos, error: ciclosError } = useCiclo()
  const { data: fincas } = useTable('fincas', { orderBy: { column: 'nombre' } })
  const {
    data: gastos,
    loading,
    error: fetchError,
    stale,
    refetch
  } = useTable('gastos_campo', {
    filters: [['ciclo_id', 'eq', selectedCicloId]],
    orderBy: { column: 'fecha', ascending: false },
    enabled: !!selectedCicloId
  })

  const { showSuccess } = useToast()
  const handleApiError = useErrorHandler()
  const { markStepDone } = useOnboarding()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (autoOpenNew && selectedCicloId) openNew()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenNew, selectedCicloId])

  function openNew() {
    setForm(emptyForm(selectedCiclo?.finca_id))
    setEditing('new')
  }

  function openEdit(row) {
    setForm({
      fecha: formatDateInput(row.fecha),
      finca_id: row.finca_id ?? '',
      categoria: row.categoria ?? '',
      descripcion: row.descripcion ?? '',
      monto: row.monto ?? '',
      notas: row.notas ?? ''
    })
    setEditing(row.id)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!confirmarFechaFueraDeCiclo(form.fecha, selectedCiclo)) return
    setSaving(true)
    setError('')
    try {
      const values = {
        fecha: form.fecha,
        finca_id: form.finca_id || null,
        ciclo_id: selectedCicloId,
        categoria: form.categoria || null,
        descripcion: form.descripcion || null,
        monto: form.monto ? Number(form.monto) : 0,
        notas: form.notas || null
      }
      if (editing === 'new') {
        await insertRow('gastos_campo', values)
      } else {
        await updateRow('gastos_campo', editing, values)
      }
      showSuccess('Gasto guardado')
      markStepDone('campo')
      setEditing(null)
      await refetch()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm('¿Eliminar este gasto de campo?')) return
    try {
      await deleteRow('gastos_campo', row.id)
      showSuccess('Gasto eliminado')
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
    return <div className="empty-state">Crea un ciclo primero para registrar gastos de campo.</div>
  }
  if (!selectedCicloId) {
    return <div className="empty-state">Selecciona un ciclo activo para ver sus gastos.</div>
  }

  return (
    <div className="fade-in">
      <OnboardingStepBanner step="campo" />
      <div className="section-header">
        <h2>Gastos de campo</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Nuevo gasto
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner" />
        </div>
      ) : fetchError && gastos.length === 0 ? (
        <ErrorState error={fetchError} onRetry={refetch} />
      ) : (
        <>
        {fetchError && stale && (
          <div className="stale-banner">⚠️ Mostrando datos guardados sin conexión. {fetchError.message}</div>
        )}
        <ListView
          data={gastos}
          emptyMessage="No hay gastos de campo en este ciclo"
          columns={[
            { key: 'fecha', label: 'Fecha', render: (r) => formatDate(r.fecha) },
            { key: 'finca', label: 'Finca', render: (r) => fincaNombre(r.finca_id) },
            { key: 'categoria', label: 'Categoría' },
            { key: 'descripcion', label: 'Descripción' },
            { key: 'monto', label: 'Monto', mono: true, render: (r) => formatCordoba(r.monto) }
          ]}
          renderCard={(r) => (
            <div className="list-card-main">
              <div className="list-card-title">{r.categoria || 'Gasto'}</div>
              <div className="list-card-sub">
                {formatDate(r.fecha)} &middot; {fincaNombre(r.finca_id)}
              </div>
              {r.descripcion && <div className="list-card-sub">{r.descripcion}</div>}
              <div className="list-card-value mono" style={{ marginTop: 6 }}>
                {formatCordoba(r.monto)}
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
          title={editing === 'new' ? 'Nuevo gasto de campo' : 'Editar gasto de campo'}
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
            <div className="field">
              <label>Categoría</label>
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} list="categorias-campo" required />
              <datalist id="categorias-campo">
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label>Descripción</label>
              <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="field">
              <label>Monto (C$)</label>
              <input
                type="number"
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                required
              />
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
