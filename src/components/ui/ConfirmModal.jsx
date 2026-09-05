import FormPanel from '../layout/FormPanel.jsx'

export default function ConfirmModal({
  title = 'Confirmar',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel
}) {
  return (
    <FormPanel
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{message}</p>
    </FormPanel>
  )
}
