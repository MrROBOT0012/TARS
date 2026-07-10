import { useState } from 'react'
import { useCiclo } from '../../hooks/useCiclo.jsx'

export default function CycleSelector() {
  const { ciclos, selectedCiclo, setSelectedCicloId } = useCiclo()
  const [open, setOpen] = useState(false)

  if (!ciclos.length) return null

  return (
    <div style={{ position: 'relative' }}>
      <button className="cycle-selector" onClick={() => setOpen((o) => !o)}>
        <span>🔄</span>
        <span>{selectedCiclo ? selectedCiclo.nombre : 'Seleccionar ciclo'}</span>
        <span>▾</span>
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            onClick={() => setOpen(false)}
          />
          <div
            className="card"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: 200,
              zIndex: 91,
              overflow: 'hidden'
            }}
          >
            {ciclos.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCicloId(c.id)
                  setOpen(false)
                }}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 14px',
                  border: 'none',
                  background: c.id === selectedCiclo?.id ? 'var(--green-light)' : 'transparent',
                  color: 'var(--ink)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>{c.nombre}</span>
                {c.estado === 'activo' && <span className="chip chip-green">activo</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
