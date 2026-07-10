const LABELS = {
  arroz_entero: 'Arroz entero',
  semolina: 'Semolina',
  puntilla: 'Puntilla',
  pallana: 'Pallana',
  fina: 'Fina'
}

export default function DerivChip({ derivado, qq }) {
  return (
    <div className="deriv-chip">
      <span className="deriv-chip-label">{LABELS[derivado] ?? derivado}</span>
      <span className="deriv-chip-value mono">{qq} qq</span>
    </div>
  )
}
