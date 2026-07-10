export default function StatRow({ icon, label, value }) {
  return (
    <div className="stat-row">
      {icon && <span className="stat-row-icon">{icon}</span>}
      <div className="stat-row-main">
        <span className="stat-row-label">{label}</span>
        <span className="stat-row-value mono">{value}</span>
      </div>
    </div>
  )
}
