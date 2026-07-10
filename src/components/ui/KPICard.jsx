export default function KPICard({ label, value, icon, tone = 'green', sub }) {
  return (
    <div className="card card-pad kpi-card">
      <div className="kpi-card-top">
        <span className="kpi-card-label">{label}</span>
        {icon && <span className={`kpi-card-icon tone-${tone}`}>{icon}</span>}
      </div>
      <div className="kpi-card-value mono">{value}</div>
      {sub && <div className="kpi-card-sub">{sub}</div>}
    </div>
  )
}
