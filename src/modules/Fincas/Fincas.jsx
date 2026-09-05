import { useState } from 'react'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast.jsx'
import { useErrorHandler } from '../../hooks/useErrorHandler.js'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { useConfirm } from '../../hooks/useConfirm.jsx'
import { calcularSaldoFinanciamiento } from '../../lib/formulas'
import { formatCordoba, formatNumber } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'
import OnboardingStepBanner from '../../components/ui/OnboardingStepBanner.jsx'

const EMPTY_FORM = {
  nombre: '',
  tipo: '',
  manzanas: '',
  notas: '',
  productor_nombre: '',
  porcentaje_ganancia_productor: '',
  interes_aplica: false,
  tasa_interes: '',
  tasa_interes_periodo: 'anual'
}

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
  const { data: financiamientos } = useTable('financiamientos', {})

  const { showSuccess } = useToast()
  const handleApiError = useErrorHandler()
  const { markStepDone } = useOnboarding()
  const confirm = useConfirm()
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
      notas: row.notas ?? '',
      productor_nombre: row.productor_nombre ?? '',
      porcentaje_ganancia_productor: row.porcentaje_ganancia_productor ?? '',
      interes_aplica: !!row.interes_aplica,
      tasa_interes: row.tasa_interes ?? '',
      tasa_interes_periodo: row.tasa_interes_periodo ?? 'anual'
    })
    setEditing(row.id)
  }

  const esFinanciada = form.tipo === 'financiada'

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const values = {
        nombre: form.nombre,
        tipo: form.tipo || null,
        manzanas: form.manzanas ? Number(form.manzanas) : null,
        notas: form.notas || null,
        // Campos de financiamiento: solo tienen sentido para tipo='financiada'.
        // Si la finca no es financiada (o dejó de serlo), se limpian en vez
        // de dejar configuración de financiamiento obsoleta colgando.
        productor_nombre: esFinanciada ? form.productor_nombre || null : null,
        porcentaje_ganancia_productor: esFinanciada && form.porcentaje_ganancia_productor
          ? Number(form.porcentaje_ganancia_productor)
          : null,
        interes_aplica: esFinanciada ? form.interes_aplica : false,
        tasa_interes: esFinanciada && form.interes_aplica && form.tasa_interes ? Number(form.tasa_interes) : null,
        tasa_interes_periodo: esFinanciada && form.interes_aplica ? form.tasa_interes_periodo : 'anual'
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
    if (!(await confirm(`¿Eliminar la finca "${row.nombre}"?`, { title: 'Eliminar finca', confirmLabel: 'Eliminar', danger: true }))) return
    try {
      await deleteRow('fincas', row.id)
      showSuccess('Finca eliminada')
      await refetch()
    } catch (err) {
      handleApiError(err)
    }
  }

  /**
   * Compact balance indicator for a financiada finca's card — the raw
   * financing ledger balance (principal + accrued interest), not the full
   * settlement against granza delivered (that comparison lives in
   * Financiamiento, where the harvest data is also loaded).
   */
  function saldoIndicador(finca) {
    if (normalizarTipo(finca.tipo) !== 'financiada') return null
    const movimientos = financiamientos.filter((m) => m.finca_id === finca.id)
    const { saldoTotal } = calcularSaldoFinanciamiento(movimientos, finca)
    if (Math.abs(saldoTotal) < 0.01) {
      return { label: 'Saldo: C$0.00', tone: 'gray' }
    }
    if (saldoTotal > 0) {
      return { label: `Saldo: ${formatCordoba(saldoTotal)} en contra`, tone: 'red' }
    }
    return { label: `Saldo: ${formatCordoba(-saldoTotal)} a favor`, tone: 'green' }
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
            {
              key: 'saldo',
              label: 'Saldo financiamiento',
              render: (r) => {
                const s = saldoIndicador(r)
                return s ? <span className={`chip chip-${s.tone}`}>{s.label}</span> : '—'
              }
            },
            { key: 'notas', label: 'Notas' }
          ]}
          renderCard={(r) => {
            const s = saldoIndicador(r)
            return (
              <div className="list-card-main">
                <div className="list-card-title">{r.nombre}</div>
                <div className="list-card-sub">
                  {TIPO_LABELS[normalizarTipo(r.tipo)] ?? r.tipo ?? 'Sin tipo'} &middot; {formatNumber(r.manzanas, 1)} mz
                </div>
                {s && (
                  <div style={{ marginTop: 6 }}>
                    <span className={`chip chip-${s.tone}`}>{s.label}</span>
                  </div>
                )}
              </div>
            )
          }}
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

            {esFinanciada && (
              <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--mist)' }}>
                <p className="field-hint" style={{ marginTop: 0, marginBottom: 12, fontWeight: 600, color: 'var(--ink)' }}>
                  Datos de financiamiento
                </p>
                <div className="field">
                  <label>Nombre del productor</label>
                  <input
                    value={form.productor_nombre}
                    onChange={(e) => setForm({ ...form, productor_nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Ganancia del productor sobre el excedente (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.porcentaje_ganancia_productor}
                    onChange={(e) => setForm({ ...form, porcentaje_ganancia_productor: e.target.value })}
                    required
                  />
                  <span className="field-hint">
                    % del excedente (valor de granza entregada por encima de lo financiado) que le corresponde al productor
                  </span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={form.interes_aplica}
                    onChange={(e) => setForm({ ...form, interes_aplica: e.target.checked })}
                  />
                  Aplica interés sobre el saldo financiado
                </label>
                {form.interes_aplica && (
                  <div className="field-row">
                    <div className="field">
                      <label>Tasa de interés (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.tasa_interes}
                        onChange={(e) => setForm({ ...form, tasa_interes: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Período de la tasa</label>
                      <select
                        value={form.tasa_interes_periodo}
                        onChange={(e) => setForm({ ...form, tasa_interes_periodo: e.target.value })}
                      >
                        <option value="anual">Anual</option>
                        <option value="mensual">Mensual</option>
                      </select>
                    </div>
                  </div>
                )}
                <span className="field-hint" style={{ display: 'block' }}>
                  Interés simple, prorrateado por día sobre el saldo pendiente, recalculado en cada movimiento.
                </span>
              </div>
            )}

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
