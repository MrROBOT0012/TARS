import { useOnboarding } from '../../hooks/useOnboarding.jsx'

const MESSAGES = {
  finca: 'Crea tu primera finca',
  ciclo: 'Crea un ciclo de producción',
  bascula: 'Registra tu primer ticket de báscula',
  secado: 'Registra el secado del viaje'
}

export default function OnboardingStepBanner({ step }) {
  const { steps, dismissedForever } = useOnboarding()

  if (dismissedForever || steps[step]) return null

  return <div className="onboarding-banner">👆 Completa este paso: {MESSAGES[step]}</div>
}
