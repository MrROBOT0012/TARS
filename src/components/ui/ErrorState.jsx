export default function ErrorState({ error, onRetry }) {
  return (
    <div className="empty-state error-state">
      <div className="icon">⚠️</div>
      <p>{error?.message ?? 'Ocurrió un error al cargar los datos.'}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  )
}
