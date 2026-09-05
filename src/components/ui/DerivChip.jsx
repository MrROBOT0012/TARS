const LABELS = {
  arroz_entero: 'Arroz entero',
  semolina: 'Semolina',
  puntilla: 'Puntilla',
  pallana: 'Pallana',
  fina: 'Fina'
}

/** `qq` is expected pre-formatted via formatQq() (already includes the " qq" unit) — don't append it again here. */
export default function DerivChip({ derivado, qq }) {
  return (
    <div className="deriv-chip">
      <span className="deriv-chip-label">{LABELS[derivado] ?? derivado}</span>
      <span className="deriv-chip-value mono">{qq}</span>
    </div>
  )
}
