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

  const show = useCallback((message, type) => {
    const id = nextToastId++
    setToasts((prev) => [...prev, { id, message, type }])
    timersRef.current[id] = setTimeout(() => dismiss(id), DISMISS_MS)
  }, [dismiss])

  const showSuccess = useCallback((message) => show(message, 'success'), [show])
  const showError = useCallback((message) => show(message, 'error'), [show])

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={'toast toast-' + t.type}
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
