import { useState } from 'react'
import { useTable, insertRow, updateRow, deleteRow } from '../../hooks/useData'
import { formatNumber } from '../../lib/formatters'
import ListView from '../../components/ui/ListView.jsx'
import FormPanel from '../../components/layout/FormPanel.jsx'

const EMPTY_FORM = { nombre: '', tipo: '', manzanas: '', notas: '' }

export default function Fincas() {
  const { data: fincas, loading, refetch } = useTable('fincas', { orderBy: { column: 'nombre' } })

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
      tipo: row.tipo ?? '',
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
      } else {
        await updateRow('fincas', editing, values)
      }
      setEditing(null)
      await refetch()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm(`¿Eliminar la finca "${row.nombre}"?`)) return
    await deleteRow('fincas', row.id)
    await refetch()
  }

  return (
    <div className="fade-in">
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
      ) : (
        <ListView
          data={fincas}
          emptyMessage="No hay fincas registradas"
          columns={[
            { key: 'nombre', label: 'Nombre' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'manzanas', label: 'Manzanas', mono: true, render: (r) => formatNumber(r.manzanas, 1) },
            { key: 'notas', label: 'Notas' }
          ]}
          renderCard={(r) => (
            <div className="list-card-main">
              <div className="list-card-title">{r.nombre}</div>
              <div className="list-card-sub">
                {r.tipo ?? 'Sin tipo'} &middot; {formatNumber(r.manzanas, 1)} mz
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
                <input
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  placeholder="Ej. propia, alquilada"
                />
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
