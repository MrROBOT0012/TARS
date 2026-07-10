/**
 * Responsive list: a data table on desktop, stacked cards on mobile.
 * Both render from the same `data` — no duplicate fetching, just markup.
 */
export default function ListView({ columns, data, renderCard, actions, keyField = 'id', emptyMessage = 'Sin registros' }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📭</div>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="table-wrap desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {actions && <th></th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row[keyField]}>
                {columns.map((col) => (
                  <td key={col.key} className={col.mono ? 'mono' : undefined}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-only">
        {data.map((row) => (
          <div key={row[keyField]} className="card list-card">
            {renderCard(row)}
            {actions && <div className="list-card-actions">{actions(row)}</div>}
          </div>
        ))}
      </div>
    </>
  )
}
