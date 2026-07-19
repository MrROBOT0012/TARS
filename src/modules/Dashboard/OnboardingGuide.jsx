const STEPS = [
  {
    key: 'finca',
    title: 'Crea tu primera finca',
    description: 'Registra el nombre y tamaño de tu campo en manzanas',
    cta: 'Crear finca →',
    path: '/fincas'
  },
  {
    key: 'ciclo',
    title: 'Crea un ciclo de producción',
    description: 'Define el período de cultivo: Primera o Segunda',
    cta: 'Crear ciclo →',
    path: '/ciclos'
  },
  {
    key: 'bascula',
    title: 'Registra tu primer ticket de báscula',
    description: 'Cuando llegue el primer camión al beneficio, registra el pesaje aquí',
    cta: 'Registrar ticket →',
    path: '/bascula?new=1'
  },
  {
    key: 'secado',
    title: 'Registra el secado del viaje',
    description: 'Después del pesaje, registra si fue en patio o secadora',
    cta: 'Ir a Proceso →',
    path: '/proceso?tab=secado'
  }
]

export default function OnboardingGuide({ done, onNavigate }) {
  const activeIndex = done.findIndex((d) => !d)

  return (
    <div className="onboarding-card card card-pad fade-in">
      <h2 className="onboarding-title">¡Bienvenido a TARS!</h2>
      <p className="onboarding-subtitle">Sigue estos pasos para empezar a registrar tu producción.</p>

      <div className="onboarding-steps">
        {STEPS.map((step, i) => {
          const isDone = done[i]
          const isLocked = activeIndex !== -1 && i > activeIndex

          return (
            <div key={step.key} className={'onboarding-step' + (isDone ? ' done' : '') + (isLocked ? ' locked' : '')}>
              <div className="onboarding-step-number">{isDone ? '✓' : i + 1}</div>
              <div className="onboarding-step-body">
                <div className="onboarding-step-title">{step.title}</div>
                <div className="onboarding-step-desc">{step.description}</div>
                {!isDone && (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={isLocked}
                    onClick={() => onNavigate(step.path)}
                  >
                    {step.cta}
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
