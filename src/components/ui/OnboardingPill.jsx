import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'
import { ONBOARDING_STEPS } from '../../lib/onboardingSteps'

const STEP_INFO = Object.fromEntries(ONBOARDING_STEPS.map((s) => [s.key, s]))

export default function OnboardingPill() {
  const { statuses, stepKeys, skippableKeys, activeStep, allDone, dismissedForever, highlightPill, skipStep } =
    useOnboarding()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  if (dismissedForever || allDone) return null

  const resolvedCount = stepKeys.filter((k) => statuses[k] !== 'pending').length
  const activeIndex = activeStep ? stepKeys.indexOf(activeStep) : -1
  const currentStepNumber = activeIndex === -1 ? stepKeys.length : activeIndex + 1

  if (!expanded) {
    return (
      <button
        className={'onboarding-pill' + (highlightPill ? ' onboarding-pill-highlight' : '')}
        onClick={() => setExpanded(true)}
      >
        <span className="onboarding-pill-label">
          Paso {currentStepNumber} de {stepKeys.length}
        </span>
        <span className="onboarding-pill-bar">
          <span
            className="onboarding-pill-bar-fill"
            style={{ width: `${(resolvedCount / stepKeys.length) * 100}%` }}
          />
        </span>
      </button>
    )
  }

  return (
    <div className="onboarding-panel">
      <div className="onboarding-panel-header">
        <span>
          Paso {currentStepNumber} de {stepKeys.length}
        </span>
        <button className="onboarding-panel-close" onClick={() => setExpanded(false)} aria-label="Minimizar">
          ✕
        </button>
      </div>
      <div className="onboarding-steps">
        {stepKeys.map((key, i) => {
          const info = STEP_INFO[key]
          const status = statuses[key]
          const isActive = key === activeStep
          const isLocked = activeIndex !== -1 && i > activeIndex

          return (
            <div
              key={key}
              className={
                'onboarding-step' +
                (status === 'done' ? ' done' : '') +
                (status === 'skipped' ? ' skipped' : '') +
                (isActive ? ' active' : '') +
                (isLocked ? ' locked' : '')
              }
            >
              <div className="onboarding-step-number">
                {status === 'done' ? '✓' : status === 'skipped' ? '–' : i + 1}
              </div>
              <div className="onboarding-step-body">
                <div className="onboarding-step-title">{info.title}</div>
                <div className="onboarding-step-desc">{info.description}</div>
                {status === 'pending' && (
                  <div className="onboarding-step-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={isLocked}
                      onClick={() => {
                        setExpanded(false)
                        navigate(info.path)
                      }}
                    >
                      {info.cta}
                    </button>
                    {skippableKeys.has(key) && !isLocked && (
                      <button className="onboarding-skip-link" onClick={() => skipStep(key)}>
                        Omitir por ahora
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
