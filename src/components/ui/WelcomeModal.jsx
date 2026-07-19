import { useState } from 'react'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { ONBOARDING_STEPS } from '../../lib/onboardingSteps'

const STORAGE_KEY = 'tars_onboarding_shown'

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

export default function WelcomeModal() {
  const { dismissedForever, triggerPillHighlight } = useOnboarding()
  const [visible, setVisible] = useState(() => !alreadyShown() && !dismissedForever)

  if (!visible) return null

  function handleStart() {
    markShown()
    setVisible(false)
    triggerPillHighlight()
  }

  return (
    <div className="welcome-modal">
      <div className="welcome-modal-content">
        <div className="welcome-brand">
          <span className="welcome-brand-dot" />
          <span>TARS</span>
        </div>
        <h1 className="welcome-title">¡Bienvenido a TARS!</h1>
        <p className="welcome-subtitle">Te guiaremos paso a paso para configurar tu operación arrocera</p>

        <div className="welcome-steps">
          {ONBOARDING_STEPS.map((step, i) => (
            <div key={step.key} className="welcome-step">
              <span className="welcome-step-icon">{step.icon}</span>
              <div className="welcome-step-body">
                <div className="welcome-step-title">
                  {i + 1}. {step.title}
                </div>
                <div className="welcome-step-desc">{step.description}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn welcome-cta" onClick={handleStart}>
          Comenzar configuración →
        </button>
      </div>
    </div>
  )
}
