import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { ONBOARDING_STEPS } from '../../lib/onboardingSteps'

const STORAGE_KEY = 'tars_onboarding_shown'
const TOTAL = ONBOARDING_STEPS.length

function alreadyShown() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return true
  }
}

function markShown() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* storage full or unavailable, ignore */
  }
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function WelcomeModal() {
  const { dismissedForever, triggerPillHighlight } = useOnboarding()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(() => !alreadyShown() && !dismissedForever)
  const [currentStep, setCurrentStep] = useState(0)
  const scrollRef = useRef(null)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const center = el.scrollLeft + el.clientWidth / 2
    let closest = 0
    let closestDist = Infinity
    Array.from(el.children).forEach((child, i) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2
      const dist = Math.abs(childCenter - center)
      if (dist < closestDist) {
        closestDist = dist
        closest = i
      }
    })
    setCurrentStep((prev) => (prev === closest ? prev : closest))
  }, [])

  const scrollToStep = useCallback((i) => {
    const el = scrollRef.current
    const card = el?.children[i]
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    setCurrentStep(i)
  }, [])

  if (!isOpen) return null

  const step = ONBOARDING_STEPS[currentStep]
  const isLast = currentStep === TOTAL - 1

  function close() {
    markShown()
    setIsOpen(false)
    triggerPillHighlight()
  }

  function handleCta() {
    close()
    navigate(step.path)
  }

  function handleSkip(e) {
    e.preventDefault()
    close()
  }

  return (
    <div className="welcome-overlay" onClick={close}>
      <div className="welcome-card" onClick={(e) => e.stopPropagation()}>
        <div className="welcome-top">
          <span className="welcome-badge">TARS · Sistema Arrocero</span>
          <h1 className="welcome-heading">¡Bienvenido!</h1>
          <p className="welcome-sub">Sigue estos 9 pasos para configurar tu operación</p>
        </div>

        <div className="welcome-carousel-wrap">
          <button
            type="button"
            className="welcome-arrow welcome-arrow-prev"
            onClick={() => scrollToStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            aria-label="Paso anterior"
          >
            ‹
          </button>
          <div className="welcome-carousel" ref={scrollRef} onScroll={handleScroll}>
            {ONBOARDING_STEPS.map((s, i) => (
              <div className="welcome-step-card" key={s.key}>
                <span className="welcome-step-badge">
                  Paso {i + 1} de {TOTAL}
                </span>
                <div className="welcome-step-hero" style={{ background: hexToRgba(s.accent, 0.15) }}>
                  {s.icon}
                </div>
                <div className="welcome-step-title">{s.title}</div>
                <div className="welcome-step-desc">{s.description}</div>
                <div className="welcome-step-bar" style={{ background: s.accent }} />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="welcome-arrow welcome-arrow-next"
            onClick={() => scrollToStep(Math.min(TOTAL - 1, currentStep + 1))}
            disabled={currentStep === TOTAL - 1}
            aria-label="Paso siguiente"
          >
            ›
          </button>
        </div>

        <div className="welcome-dots">
          {ONBOARDING_STEPS.map((s, i) => (
            <button
              type="button"
              key={s.key}
              className="welcome-dot"
              style={{
                width: i === currentStep ? '20px' : '6px',
                background: i === currentStep ? '#1A6B42' : '#D1D5DB'
              }}
              onClick={() => scrollToStep(i)}
              aria-label={`Ir al paso ${i + 1}`}
            />
          ))}
        </div>

        <div className="welcome-bottom">
          <div className="welcome-progress">
            Paso {currentStep + 1} de {TOTAL}
          </div>
          <button
            type="button"
            className="welcome-cta"
            style={{ background: isLast ? '#C47B1A' : '#1A6B42' }}
            onClick={handleCta}
          >
            {isLast ? '¡Comenzar ahora! →' : `Ir a ${step.target} →`}
          </button>
          <button type="button" className="welcome-skip" onClick={handleSkip}>
            Saltar por ahora
          </button>
        </div>
      </div>
    </div>
  )
}
