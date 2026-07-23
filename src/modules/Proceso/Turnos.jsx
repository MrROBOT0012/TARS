import { useEffect, useMemo, useState } from 'react'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useCiclo } from '../../hooks/useCiclo.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { formatCordoba, formatQq, formatDate, formatDateInput, todayInput } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import StatusChip from '../../components/ui/StatusChip.jsx'
import DerivChip from '../../components/ui/DerivChip.jsx'
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
    bascula_ids: [],
    origen_pila: '',
    costo_llenado_pila: '',
    precio_trillado_qq: '',
    estado: 'completado',
    beneficio: '',
    derivados: { arroz_entero: '', semolina: '', puntilla: '', pallana: '', fina: '' },
    notas: ''
  }
}

export default function Turnos({ autoOpenNew }) {
  const { selectedCicloId, selectedCiclo, ciclos, error: ciclosError } = useCiclo()
  const cicloFilter = [['ciclo_id', 'eq', selectedCicloId]]
  const enabled = !!selectedCicloId

  const { data: basculas } = useTable('basculas', { filters: cicloFilter, enabled })
  const { data: embodegados } = useTable('embodegados', { filters: cicloFilter, enabled })
  const {
    data: turnos,
    loading,
    error: fetchError,
    stale,
    refetch
  } = useTable('turnos_trillo', {
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
    turnos.forEach((t) => {
      if (editing !== 'new' && t.id === editing) return
      ;(t.bascula_ids ?? []).forEach((id) => used.add(id))
    })
    return used
  }, [turnos, editing])

  const availableEmbodegados = embodegados.filter(
    (e) => !usedBasculaIds.has(e.bascula_id) || form.bascula_ids.includes(e.bascula_id)
  )

  function openNew() {
    setForm(emptyForm(selectedCiclo?.finca_id))
    setEditing('new')
  }

  function openEdit(row) {
    setForm({
      fecha: formatDateInput(row.fecha),
      finca_id: row.finca_id ?? '',
      bascula_ids: row.bascula_ids ?? [],
      origen_pila: row.origen_pila ?? '',
      costo_llenado_pila: row.costo_llenado_pila ?? '',
      precio_trillado_qq: row.precio_trillado_qq ?? '',
      estado: row.estado ?? 'completado',
      beneficio: row.beneficio ?? '',
      derivados: DERIVADOS_KEYS.reduce((acc, k) => ({ ...acc, [k]: row.derivados?.[k] ?? '' }), {}),
      notas: row.notas ?? ''
    })
    setEditing(row.id)
  }

  function toggleBascula(basculaId) {
    setForm((f) => ({
      ...f,
      bascula_ids: f.bascula_ids.includes(basculaId)
        ? f.bascula_ids.filter((id) => id !== basculaId)
        : [...f.bascula_ids, basculaId]
    }))
  }

  const qqTotales = form.bascula_ids.reduce((sum, id) => {
    const e = embodegados.find((emb) => emb.bascula_id === id)
    return sum + (Number(e?.qq_embodegados) || 0)
  }, 0)
  const costoTrillado = (Number(form.precio_trillado_qq) || 0) * qqTotales + (Number(form.costo_llenado_pila) || 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const derivados = DERIVADOS_KEYS.reduce((acc, k) => {
        acc[k] = form.derivados[k] ? Number(form.derivados[k]) : 0
        return acc
      }, {})
      const values = {
        fecha: form.fecha,
        finca_id: form.finca_id || null,
        ciclo_id: selectedCicloId,
        bascula_ids: form.bascula_ids,
        qq_totales: qqTotales,
        origen_pila: form.origen_pila || null,
        costo_llenado_pila: form.costo_llenado_pila ? Number(form.costo_llenado_pila) : 0,
        estado: form.estado,
        precio_trillado_qq: form.precio_trillado_qq ? Number(form.precio_trillado_qq) : 0,
        beneficio: form.beneficio || null,
        derivados,
        notas: form.notas || null
      }
      if (editing === 'new') {
        await insertRow('turnos_trillo', values)
      } else {
        await updateRow('turnos_trillo', editing, values)
      }
      showSuccess('Turno de trillo registrado')
      markStepDone('turno')
      setEditing(null)
      await refetch()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm('¿Eliminar este turno de trillo?')) return
    try {
      await deleteRow('turnos_trillo', row.id)
      showSuccess('Turno de trillo eliminado')
      await refetch()
    } catch (err) {
      handleApiError(err)
    }
  }

  const ticketOf = (id) => basculas.find((b) => String(b.id) === String(id))?.no_ticket ?? '—'
  const ticketLabel = (id) => {
    const b = basculas.find((x) => String(x.id) === String(id))
    if (!b) return '#—'
    return `#${b.no_ticket}${b.nombre_productor ? ` · ${b.nombre_productor}` : ''}`
  }

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
      <OnboardingStepBanner step="turno" />
      <div className="section-header">
        <h2>Turnos de trillo</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + Nuevo turno
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner" />
        </div>
      ) : fetchError && turnos.length === 0 ? (
        <ErrorState error={fetchError} onRetry={refetch} />
      ) : (
        <>
        {fetchError && stale && (
          <div className="stale-banner">⚠️ Mostrando datos guardados sin conexión. {fetchError.message}</div>
        )}
        <ListView
          data={turnos}
          emptyMessage="No hay turnos de trillo en este ciclo"
          columns={[
            { key: 'fecha', label: 'Fecha', render: (r) => formatDate(r.fecha) },
            { key: 'viajes', label: 'Viajes', render: (r) => (r.bascula_ids ?? []).map((id) => `#${ticketOf(id)}`).join(', ') },
            { key: 'qq_totales', label: 'QQ totales', mono: true, render: (r) => formatQq(r.qq_totales, 1) },
            { key: 'origen_pila', label: 'Origen pila' },
            { key: 'estado', label: 'Estado', render: (r) => <StatusChip status={r.estado} /> }
          ]}
          renderCard={(r) => (
            <div className="list-card-main">
              <div className="list-card-title">{formatDate(r.fecha)}</div>
              <div className="list-card-sub">{(r.bascula_ids ?? []).map((id) => `#${ticketOf(id)}`).join(', ')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span className="list-card-value mono">{formatQq(r.qq_totales, 1)}</span>
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
          title={editing === 'new' ? 'Nuevo turno de trillo' : 'Editar turno de trillo'}
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
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </div>

            <div className="field">
              <label>Viajes a incluir (embodegados disponibles)</label>
              <div className="bascula-select-list">
                {availableEmbodegados.length === 0 && (
                  <span className="field-hint">No hay viajes embodegados disponibles</span>
                )}
                {availableEmbodegados.map((emb) => (
                  <label
                    key={emb.id}
                    className={'bascula-select-item' + (form.bascula_ids.includes(emb.bascula_id) ? ' checked' : '')}
                  >
                    <input
                      type="checkbox"
                      className="bascula-select-checkbox"
                      checked={form.bascula_ids.includes(emb.bascula_id)}
                      onChange={() => toggleBascula(emb.bascula_id)}
                    />
                    <div className="bascula-select-info">
                      <div className="bascula-select-title">{ticketLabel(emb.bascula_id)}</div>
                      <div className="bascula-select-sub">{formatQq(emb.qq_embodegados, 1)} qq secos · Embodegado</div>
                    </div>
                    <span className="bascula-select-badge mono">{formatQq(emb.qq_embodegados, 1)} qq</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>QQ totales seleccionados</label>
              <input className="mono" value={formatQq(qqTotales, 2)} disabled readOnly />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Origen de la pila</label>
                <input value={form.origen_pila} onChange={(e) => setForm({ ...form, origen_pila: e.target.value })} />
              </div>
              <div className="field">
                <label>Beneficio (trillo)</label>
                <input value={form.beneficio} onChange={(e) => setForm({ ...form, beneficio: e.target.value })} />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Costo llenado de pila (C$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.costo_llenado_pila}
                  onChange={(e) => setForm({ ...form, costo_llenado_pila: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Precio trillado / QQ (C$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.precio_trillado_qq}
                  onChange={(e) => setForm({ ...form, precio_trillado_qq: e.target.value })}
                />
              </div>
            </div>
            <span className="field-hint" style={{ display: 'block', marginTop: -8, marginBottom: 16 }}>
              Costo total de trillado: {formatCordoba(costoTrillado)}
            </span>

            <div className="field">
              <label>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="completado">Completado</option>
                <option value="parcial">Parcial</option>
              </select>
            </div>

            <div className="field">
              <label>Derivados producidos (qq)</label>
              <div className="deriv-inputs">
                {DERIVADOS_KEYS.map((key) => (
                  <div className="field" key={key} style={{ marginBottom: 0 }}>
                    <label>{DERIVADOS_LABELS[key]}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.derivados[key]}
                      onChange={(e) => setForm({ ...form, derivados: { ...form.derivados, [key]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="deriv-summary-grid">
              {DERIVADOS_KEYS.map((key) => (
                <DerivChip key={key} derivado={key} qq={formatQq(form.derivados[key] || 0, 1)} />
              ))}
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
