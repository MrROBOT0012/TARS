import { useOnboarding } from '../../hooks/useOnboarding.jsx'

export default function OnboardingStepBanner({ step }) {
  const { activeStep, dismissedForever } = useOnboarding()

  if (dismissedForever || activeStep !== step) return null

  return <div className="onboarding-banner">👆 Completa este paso aquí</div>
}
