export default function ActionButton({ icon, label, onClick }) {
  return (
    <button className="action-btn" onClick={onClick}>
      <span className="action-btn-icon">{icon}</span>
      <span className="action-btn-label">{label}</span>
    </button>
  )
}
