import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)
const DISMISS_MS = 3000

let nextToastId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
  }, [])

  const show = useCallback((message, type, { duration = DISMISS_MS, celebration = false } = {}) => {
    const id = nextToastId++
    setToasts((prev) => [...prev, { id, message, type, celebration }])
    timersRef.current[id] = setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const showSuccess = useCallback((message, options) => show(message, 'success', options), [show])
  const showError = useCallback((message, options) => show(message, 'error', options), [show])

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={'toast toast-' + t.type + (t.celebration ? ' toast-celebration' : '')}
            role="status"
            onClick={() => dismiss(t.id)}
          >
            <span className="toast-icon">{t.type === 'success' ? '✅' : '⚠️'}</span>
            <span className="toast-message">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
