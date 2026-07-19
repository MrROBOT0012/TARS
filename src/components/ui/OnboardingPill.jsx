import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../hooks/useOnboarding.jsx'

const STEP_INFO = {
  finca: {
    title: 'Crea tu primera finca',
    description: 'Registra el nombre y tamaño de tu campo en manzanas',
    cta: 'Crear finca →',
    path: '/fincas'
  },
  ciclo: {
    title: 'Crea un ciclo de producción',
    description: 'Define el período de cultivo: Primera o Segunda',
    cta: 'Crear ciclo →',
    path: '/ciclos'
  },
  bascula: {
    title: 'Registra tu primer ticket de báscula',
    description: 'Cuando llegue el primer camión al beneficio, registra el pesaje aquí',
    cta: 'Registrar ticket →',
    path: '/bascula?new=1'
  },
  secado: {
    title: 'Registra el secado del viaje',
    description: 'Después del pesaje, registra si fue en patio o secadora',
    cta: 'Ir a Proceso →',
    path: '/proceso?tab=secado'
  }
}

export default function OnboardingPill() {
  const { steps, stepKeys, allDone, dismissedForever } = useOnboarding()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  if (dismissedForever || allDone) return null

  const doneCount = stepKeys.filter((k) => steps[k]).length
  const activeIndex = stepKeys.findIndex((k) => !steps[k])

  if (!expanded) {
    return (
      <button className="onboarding-pill" onClick={() => setExpanded(true)}>
        <span className="onboarding-pill-label">
          Configuración {doneCount}/{stepKeys.length}
        </span>
        <span className="onboarding-pill-bar">
          <span
            className="onboarding-pill-bar-fill"
            style={{ width: `${(doneCount / stepKeys.length) * 100}%` }}
          />
        </span>
      </button>
    )
  }

  return (
    <div className="onboarding-panel">
      <div className="onboarding-panel-header">
        <span>
          Configuración {doneCount}/{stepKeys.length}
        </span>
        <button className="onboarding-panel-close" onClick={() => setExpanded(false)} aria-label="Minimizar">
          ✕
        </button>
      </div>
      <div className="onboarding-steps">
        {stepKeys.map((key, i) => {
          const info = STEP_INFO[key]
          const isDone = steps[key]
          const isLocked = activeIndex !== -1 && i > activeIndex
          return (
            <div key={key} className={'onboarding-step' + (isDone ? ' done' : '') + (isLocked ? ' locked' : '')}>
              <div className="onboarding-step-number">{isDone ? '✓' : i + 1}</div>
              <div className="onboarding-step-body">
                <div className="onboarding-step-title">{info.title}</div>
                <div className="onboarding-step-desc">{info.description}</div>
                {!isDone && (
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
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
