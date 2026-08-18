import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { formatCordoba, formatQq, formatDate, formatDateInput, todayInput } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'
import OnboardingStepBanner from '../../components/ui/OnboardingStepBanner.jsx'

function emptyForm(fincaId) {
  return {
    no_ticket: '',
    fecha: todayInput(),
    hora: '',
    finca_id: fincaId ?? '',
    nombre_productor: '',
    placa: '',
    conductor: '',
    peso_bruto: '',
    tara: '',
    qq_neto: '',
    precio_flete_qq: '',
    origen_viaje: 'propio',
    proveedor_granza: '',
    precio_granza_qq: '',
    beneficio: '',
    notas: ''
  }
}

function calcQqNeto(pesoBruto, tara) {
  const bruto = Number(pesoBruto)
  const t = Number(tara)
  if (!Number.isFinite(bruto) || !Number.isFinite(t)) return ''
  const neto = bruto - t
  return neto > 0 ? neto.toFixed(2) : ''
}

export default function Bascula() {
  const [searchParams] = useSearchParams()
  const autoOpenNew = searchParams.get('new') === '1'
  const { selectedCicloId, selectedCiclo, ciclos, error: ciclosError } = useCiclo()
  const { data: fincas } = useTable('fincas', { orderBy: { column: 'nombre' } })
  const {
    data: basculas,
    loading,
    error: fetchError,
    stale,
    refetch
  } = useTable('basculas', {
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
      no_ticket: row.no_ticket ?? '',
      fecha: formatDateInput(row.fecha),
      hora: row.hora ?? '',
      finca_id: row.finca_id ?? '',
      nombre_productor: row.nombre_productor ?? '',
      placa: row.placa ?? '',
      conductor: row.conductor ?? '',
      peso_bruto: row.peso_bruto ?? '',
      tara: row.tara ?? '',
      qq_neto: row.qq_neto ?? '',
      precio_flete_qq: row.precio_flete_qq ?? '',
      origen_viaje: row.origen_viaje ?? 'propio',
      proveedor_granza: row.proveedor_granza ?? '',
      precio_granza_qq: row.precio_granza_qq ?? '',
      beneficio: row.beneficio ?? '',
      notas: row.notas ?? ''
    })
    setEditing(row.id)
  }

  function updatePeso(field, value) {
    const next = { ...form, [field]: value }
    const autoNeto = calcQqNeto(next.peso_bruto, next.tara)
    if (autoNeto) next.qq_neto = autoNeto
    setForm(next)
  }

  const qqNetoNum = Number(form.qq_neto) || 0
  const costoFleteTotal = (Number(form.precio_flete_qq) || 0) * qqNetoNum
  const costoGranzaTotal = form.origen_viaje === 'comprado' ? (Number(form.precio_granza_qq) || 0) * qqNetoNum : 0

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const values = {
        no_ticket: form.no_ticket,
        fecha: form.fecha,
        hora: form.hora || null,
        finca_id: form.finca_id || null,
        ciclo_id: selectedCicloId,
        nombre_productor: form.nombre_productor || null,
        placa: form.placa || null,
        conductor: form.conductor || null,
        peso_bruto: form.peso_bruto ? Number(form.peso_bruto) : null,
        tara: form.tara ? Number(form.tara) : null,
        qq_neto: form.qq_neto ? Number(form.qq_neto) : 0,
        precio_flete_qq: form.precio_flete_qq ? Number(form.precio_flete_qq) : 0,
        costo_flete_total: costoFleteTotal,
        origen_viaje: form.origen_viaje,
        proveedor_granza: form.origen_viaje === 'comprado' ? form.proveedor_granza || null : null,
        precio_granza_qq: form.origen_viaje === 'comprado' ? Number(form.precio_granza_qq) || 0 : 0,
        costo_granza_total: costoGranzaTotal,
        beneficio: form.beneficio || null,
        notas: form.notas || null
      }
      if (editing === 'new') {
        await insertRow('basculas', values)
      } else {
        await updateRow('basculas', editing, values)
      }
      showSuccess('Ticket registrado correctamente')
      markStepDone('bascula')
      setEditing(null)
      await refetch()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm(`¿Eliminar el viaje #${row.no_ticket}?`)) return
    try {
      await deleteRow('basculas', row.id)
      showSuccess('Ticket eliminado')
      await refetch()
    } catch (err) {
      handleApiError(err)
    }
  }

  const fincaNombre = (id) => fincas.find((f) => f.id === id)?.nombre ?? '—'

  const totalQq = useMemo(() => basculas.reduce((sum, b) => sum + (Number(b.qq_neto) || 0), 0), [basculas])

  if (ciclosError && !ciclos.length) {
    return <ErrorState error={ciclosError} />
  }
  if (!ciclos.length) {
    return <div className="empty-state">Crea un ciclo primero para registrar viajes de báscula.</div>
  }
  if (!selectedCicloId) {
    return <div className="empty-state">Selecciona un ciclo activo para ver sus viajes.</div>
  }

  return (
    <div className="fade-in">
      <OnboardingStepBanner step="bascula" />
      <div className="section-header">
        <h2>Báscula &middot; {formatQq(totalQq, 1)} total</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Nuevo viaje
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner" />
        </div>
      ) : fetchError && basculas.length === 0 ? (
        <ErrorState error={fetchError} onRetry={refetch} />
      ) : (
        <>
        {fetchError && stale && (
          <div className="stale-banner">⚠️ Mostrando datos guardados sin conexión. {fetchError.message}</div>
        )}
        <ListView
          data={basculas}
          emptyMessage="No hay viajes registrados en este ciclo"
          columns={[
            { key: 'no_ticket', label: 'Ticket', mono: true },
            { key: 'fecha', label: 'Fecha', render: (r) => formatDate(r.fecha) },
            { key: 'nombre_productor', label: 'Productor' },
            { key: 'placa', label: 'Placa' },
            { key: 'qq_neto', label: 'QQ neto', mono: true, render: (r) => formatQq(r.qq_neto, 1) },
            { key: 'origen_viaje', label: 'Origen', render: (r) => <StatusChip status={r.origen_viaje} /> },
            { key: 'costo_flete_total', label: 'Costo flete', mono: true, render: (r) => formatCordoba(r.costo_flete_total) }
          ]}
          renderCard={(r) => (
            <div className="list-card-main">
              <div className="list-card-title mono">#{r.no_ticket}</div>
              <div className="list-card-sub">
                {r.nombre_productor} &middot; {formatDate(r.fecha)}
              </div>
              <div className="list-card-sub">{fincaNombre(r.finca_id)} &middot; {r.placa}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span className="list-card-value mono">{formatQq(r.qq_neto, 1)}</span>
                <StatusChip status={r.origen_viaje} />
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
          title={editing === 'new' ? 'Nuevo viaje (báscula)' : `Editar viaje #${form.no_ticket}`}
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
                <label>No. de ticket</label>
                <input value={form.no_ticket} onChange={(e) => setForm({ ...form, no_ticket: e.target.value })} required />
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
                <label>Fecha</label>
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
              </div>
              <div className="field">
                <label>Hora</label>
                <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Nombre del productor</label>
              <input value={form.nombre_productor} onChange={(e) => setForm({ ...form, nombre_productor: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Placa</label>
                <input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} />
              </div>
              <div className="field">
                <label>Conductor</label>
                <input value={form.conductor} onChange={(e) => setForm({ ...form, conductor: e.target.value })} />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Peso bruto (QQ)</label>
                <input type="number" step="0.01" value={form.peso_bruto} onChange={(e) => updatePeso('peso_bruto', e.target.value)} required />
              </div>
              <div className="field">
                <label>Tara (QQ)</label>
                <input type="number" step="0.01" value={form.tara} onChange={(e) => updatePeso('tara', e.target.value)} required />
              </div>
            </div>
            <div className="field">
              <label>QQ neto (calculado, ajustable)</label>
              <input type="number" step="0.01" value={form.qq_neto} onChange={(e) => setForm({ ...form, qq_neto: e.target.value })} required />
            </div>

            <div className="field">
              <label>Origen del viaje</label>
              <select value={form.origen_viaje} onChange={(e) => setForm({ ...form, origen_viaje: e.target.value })}>
                <option value="propio">Propio</option>
                <option value="comprado">Comprado</option>
              </select>
            </div>

            <div className="field">
              <label>Precio flete / QQ (C$)</label>
              <input type="number" step="0.01" value={form.precio_flete_qq} onChange={(e) => setForm({ ...form, precio_flete_qq: e.target.value })} />
              <span className="field-hint">Costo flete total: {formatCordoba(costoFleteTotal)}</span>
            </div>

            {form.origen_viaje === 'comprado' && (
              <>
                <div className="field">
                  <label>Proveedor de granza</label>
                  <input value={form.proveedor_granza} onChange={(e) => setForm({ ...form, proveedor_granza: e.target.value })} />
                </div>
                <div className="field">
                  <label>Precio granza / QQ (C$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precio_granza_qq}
                    onChange={(e) => setForm({ ...form, precio_granza_qq: e.target.value })}
                  />
                  <span className="field-hint">Costo granza total: {formatCordoba(costoGranzaTotal)}</span>
                </div>
              </>
            )}

            <div className="field">
              <label>Beneficio (trillo)</label>
              <input value={form.beneficio} onChange={(e) => setForm({ ...form, beneficio: e.target.value })} />
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
