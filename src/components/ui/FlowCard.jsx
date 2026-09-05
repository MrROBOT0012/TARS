const STEPS = [
  { key: 'bascula', label: 'Báscula' },
  { key: 'secado', label: 'Secado' },
  { key: 'embodegado', label: 'Bodega' },
  { key: 'turno', label: 'Turno' }
]

/**
 * status: object with boolean/string per step, e.g.
 * { bascula: true, secado: 'active', embodegado: false, turno: false }
 *
 * `qq` is expected pre-formatted via formatQq() (already includes the " qq" unit).
 */
export default function FlowCard({ ticket, productor, qq, status, onClick }) {
  const stepState = (key) => {
    const v = status[key]
    if (v === true || v === 'done') return 'done'
    if (v === 'active') return 'active'
    return 'pending'
  }

  return (
    <div className="card card-pad flow-card" onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="flow-card-header">
        <div>
          <div className="flow-card-title mono">#{ticket}</div>
          <div className="flow-card-sub">{productor}</div>
        </div>
        <div className="flow-card-sub mono">{qq}</div>
      </div>
      <div className="flow-steps">
        {STEPS.map((step, idx) => (
          <div key={step.key} style={{ display: 'contents' }}>
            <div className={`flow-step ${stepState(step.key)}`}>
              <div className="flow-step-dot">
                {stepState(step.key) === 'done' ? '✓' : idx + 1}
              </div>
              <div className="flow-step-label">{step.label}</div>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flow-connector ${stepState(step.key) === 'done' ? 'done' : ''}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
