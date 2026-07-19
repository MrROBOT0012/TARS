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
    description: 'Define el período: Primera (ene-may) o Segunda (jun-oct)',
    cta: 'Crear ciclo →',
    path: '/ciclos'
  },
  campo: {
    title: 'Registra los gastos de campo',
    description: 'Anota los gastos de insumos, mano de obra, maquinaria y más',
    cta: 'Registrar gasto →',
    path: '/campo?new=1'
  },
  cosecha: {
    title: 'Registra la cosecha',
    description: 'Cuántos quintales se cosecharon y la humedad al corte',
    cta: 'Registrar cosecha →',
    path: '/cosecha?new=1'
  },
  bascula: {
    title: 'Registra el ticket de báscula',
    description: 'Cuando llegue el camión al beneficio, registra el pesaje y el flete',
    cta: 'Registrar ticket →',
    path: '/bascula?new=1'
  },
  secado: {
    title: 'Registra el secado del viaje',
    description: '¿Se secó en patio o secadora? Registra humedad y calcula la merma',
    cta: 'Ir a Proceso →',
    path: '/proceso?tab=secado&new=1'
  },
  embodegado: {
    title: 'Registra el embodegado',
    description: 'Cuántos QQ y sacos entraron a bodega después del secado',
    cta: 'Ir a Proceso →',
    path: '/proceso?tab=embodegado&new=1'
  },
  turno: {
    title: 'Registra el turno de trillo',
    description: 'Agrupa los viajes del turno y registra los derivados producidos',
    cta: 'Ir a Proceso →',
    path: '/proceso?tab=turnos&new=1'
  },
  venta: {
    title: 'Registra la primera venta',
    description: 'A qué precio y a quién se vendió el arroz entero y los derivados',
    cta: 'Registrar venta →',
    path: '/ventas?new=1'
  }
}

export default function OnboardingPill() {
  const { statuses, stepKeys, skippableKeys, activeStep, allDone, dismissedForever, skipStep } = useOnboarding()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  if (dismissedForever || allDone) return null

  const resolvedCount = stepKeys.filter((k) => statuses[k] !== 'pending').length
  const activeIndex = activeStep ? stepKeys.indexOf(activeStep) : -1
  const currentStepNumber = activeIndex === -1 ? stepKeys.length : activeIndex + 1

  if (!expanded) {
    return (
      <button className="onboarding-pill" onClick={() => setExpanded(true)}>
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
