import { createContext, useCallback, useContext, useRef, useState } from 'react'
import ConfirmModal from '../components/ui/ConfirmModal.jsx'

const ConfirmContext = createContext(null)

/**
 * Renders one ConfirmModal at the app root and exposes an async confirm()
 * that resolves true/false — a drop-in replacement for window.confirm()
 * that every module can `await` instead of blocking on the native dialog
 * (which renders as an OS dialog on mobile rather than an in-app sheet).
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setRequest({ message, ...options })
    })
  }, [])

  function settle(result) {
    setRequest(null)
    resolveRef.current?.(result)
    resolveRef.current = null
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <ConfirmModal
          title={request.title}
          message={request.message}
          confirmLabel={request.confirmLabel}
          cancelLabel={request.cancelLabel}
          danger={request.danger}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
