export default function BottomSheet({ title, onClose, children }) {
  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex: 60 }} />
      <div className="bottom-sheet">
        <div className="bottom-sheet-header">
          <h3>{title}</h3>
          <button className="bottom-sheet-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="bottom-sheet-body">{children}</div>
      </div>
    </>
  )
}
