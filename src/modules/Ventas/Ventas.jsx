import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { formatCordoba, formatQq, formatDate, formatDateInput, todayInput } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'
import OnboardingStepBanner from '../../components/ui/OnboardingStepBanner.jsx'

const DERIVADOS_KEYS = ['arroz_entero', 'semolina', 'puntilla', 'pallana', 'fina']
const DERIVADOS_LABELS = {
  arroz_entero: 'Arroz entero',
  semolina: 'Semolina',
  puntilla: 'Puntilla',
  pallana: 'Pallana',
  fina: 'Fina'
}

function emptyForm(fincaId) {
  return {
    fecha: todayInput(),
    finca_id: fincaId ?? '',
    derivado: 'arroz_entero',
    qq_vendidos: '',
    precio_qq: '',
    comprador: '',
    notas: ''
  }
}

export default function Ventas() {
  const [searchParams] = useSearchParams()
  const autoOpenNew = searchParams.get('new') === '1'
  const { selectedCicloId, selectedCiclo, ciclos, error: ciclosError } = useCiclo()
  const { data: fincas } = useTable('fincas', { orderBy: { column: 'nombre' } })
  const {
    data: ventas,
    loading,
    error: fetchError,
    stale,
    refetch
  } = useTable('ventas', {
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
      derivado: row.derivado ?? 'arroz_entero',
      qq_vendidos: row.qq_vendidos ?? '',
      precio_qq: row.precio_qq ?? '',
      comprador: row.comprador ?? '',
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
        derivado: form.derivado,
        qq_vendidos: form.qq_vendidos ? Number(form.qq_vendidos) : 0,
        precio_qq: form.precio_qq ? Number(form.precio_qq) : 0,
        comprador: form.comprador || null,
        notas: form.notas || null
      }
      if (editing === 'new') {
        await insertRow('ventas', values)
      } else {
        await updateRow('ventas', editing, values)
      }
      showSuccess('Venta registrada')
      markStepDone('venta')
      setEditing(null)
      await refetch()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm('¿Eliminar este registro de venta?')) return
    try {
      await deleteRow('ventas', row.id)
      showSuccess('Venta eliminada')
      await refetch()
    } catch (err) {
      handleApiError(err)
    }
  }

  const fincaNombre = (id) => fincas.find((f) => f.id === id)?.nombre ?? '—'
  const totalIngresos = useMemo(
    () => ventas.reduce((sum, v) => sum + (Number(v.qq_vendidos) || 0) * (Number(v.precio_qq) || 0), 0),
    [ventas]
  )

  if (ciclosError && !ciclos.length) {
    return <ErrorState error={ciclosError} />
  }
  if (!ciclos.length) {
    return <div className="empty-state">Crea un ciclo primero para registrar ventas.</div>
  }
  if (!selectedCicloId) {
    return <div className="empty-state">Selecciona un ciclo activo para ver sus ventas.</div>
  }

  return (
    <div className="fade-in">
      <OnboardingStepBanner step="venta" />
      <div className="section-header">
        <h2>Ventas &middot; {formatCordoba(totalIngresos)}</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Nueva venta
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner" />
        </div>
      ) : fetchError && ventas.length === 0 ? (
        <ErrorState error={fetchError} onRetry={refetch} />
      ) : (
        <>
        {fetchError && stale && (
          <div className="stale-banner">⚠️ Mostrando datos guardados sin conexión. {fetchError.message}</div>
        )}
        <ListView
          data={ventas}
          emptyMessage="No hay ventas registradas en este ciclo"
          columns={[
            { key: 'fecha', label: 'Fecha', render: (r) => formatDate(r.fecha) },
            { key: 'finca', label: 'Finca', render: (r) => fincaNombre(r.finca_id) },
            { key: 'derivado', label: 'Derivado', render: (r) => DERIVADOS_LABELS[r.derivado] ?? r.derivado },
            { key: 'qq_vendidos', label: 'QQ vendidos', mono: true, render: (r) => formatQq(r.qq_vendidos, 1) },
            { key: 'precio_qq', label: 'Precio/QQ', mono: true, render: (r) => formatCordoba(r.precio_qq) },
            { key: 'total', label: 'Total', mono: true, render: (r) => formatCordoba((r.qq_vendidos || 0) * (r.precio_qq || 0)) },
            { key: 'comprador', label: 'Comprador' }
          ]}
          renderCard={(r) => (
            <div className="list-card-main">
              <div className="list-card-title">{DERIVADOS_LABELS[r.derivado] ?? r.derivado}</div>
              <div className="list-card-sub">
                {formatDate(r.fecha)} &middot; {fincaNombre(r.finca_id)} &middot; {r.comprador || 'sin comprador'}
              </div>
              <div className="list-card-value mono" style={{ marginTop: 6 }}>
                {formatQq(r.qq_vendidos, 1)} &times; {formatCordoba(r.precio_qq)} = {formatCordoba((r.qq_vendidos || 0) * (r.precio_qq || 0))}
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
          title={editing === 'new' ? 'Nueva venta' : 'Editar venta'}
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
                <select value={form.finca_id} onChange={(e) => setForm({ ...form, finca_id: e.target.value })}>
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
              <label>Derivado</label>
              <select value={form.derivado} onChange={(e) => setForm({ ...form, derivado: e.target.value })}>
                {DERIVADOS_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {DERIVADOS_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <div className="field">
                <label>QQ vendidos</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.qq_vendidos}
                  onChange={(e) => setForm({ ...form, qq_vendidos: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Precio / QQ (C$)</label>
                <input type="number" step="0.01" value={form.precio_qq} onChange={(e) => setForm({ ...form, precio_qq: e.target.value })} required />
              </div>
            </div>
            <div className="field">
              <label>Comprador</label>
              <input value={form.comprador} onChange={(e) => setForm({ ...form, comprador: e.target.value })} />
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
