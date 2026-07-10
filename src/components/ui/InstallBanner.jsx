import { useEffect, useState } from 'react'

const DISMISS_KEY = 'tars_install_banner_dismissed'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return

    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    if (isIos()) {
      setIosHint(true)
      setVisible(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    dismiss()
  }

  if (!visible) return null

  return (
    <div className="install-banner">
      <span className="install-banner-icon">📲</span>
      <div className="install-banner-text">
        <strong>Instala TARS</strong>
        <span>{iosHint ? 'Toca Compartir → Agregar a inicio' : 'Agrega la app a tu pantalla de inicio'}</span>
      </div>
      {!iosHint && (
        <button className="btn btn-primary btn-sm" onClick={install}>
          Instalar
        </button>
      )}
      <button className="install-banner-close" onClick={dismiss} aria-label="Cerrar">
        ✕
      </button>
    </div>
  )
}
