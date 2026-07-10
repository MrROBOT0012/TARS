import { useIsDesktop } from '../../hooks/useMediaQuery'
import Modal from './Modal.jsx'
import BottomSheet from './BottomSheet.jsx'

export default function FormPanel({ title, onClose, children, footer }) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <Modal title={title} onClose={onClose} footer={footer}>
        {children}
      </Modal>
    )
  }

  return (
    <BottomSheet title={title} onClose={onClose}>
      {children}
      {footer && <div style={{ marginTop: 16 }}>{footer}</div>}
    </BottomSheet>
  )
}
