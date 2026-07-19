import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './useToast.jsx'

const OnboardingContext = createContext(null)
const STORAGE_KEY = 'tars_onboarding_v1'
const STEP_KEYS = ['finca', 'ciclo', 'bascula', 'secado']
const STEP_TABLES = { finca: 'fincas', ciclo: 'ciclos', bascula: 'basculas', secado: 'secados' }

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage full or unavailable, ignore */
  }
}

export function OnboardingProvider({ children }) {
  const { showSuccess } = useToast()
  const saved = readStorage()
  const [dismissedForever, setDismissedForever] = useState(saved?.dismissedForever ?? false)
  const [steps, setSteps] = useState(
    saved?.steps ?? { finca: false, ciclo: false, bascula: false, secado: false }
  )
  const celebratedRef = useRef(saved?.dismissedForever ?? false)

  useEffect(() => {
    if (dismissedForever) return
    let cancelled = false
    async function verify() {
      const results = await Promise.all(
        STEP_KEYS.map((key) => supabase.from(STEP_TABLES[key]).select('id', { count: 'exact', head: true }))
      )
      if (cancelled) return
      setSteps((prev) => {
        let changed = false
        const next = { ...prev }
        STEP_KEYS.forEach((key, i) => {
          const { count, error } = results[i]
          if (!error && (count ?? 0) > 0 && !next[key]) {
            next[key] = true
            changed = true
          }
        })
        return changed ? next : prev
      })
    }
    verify()
    return () => {
      cancelled = true
    }
  }, [dismissedForever])

  useEffect(() => {
    const allDone = STEP_KEYS.every((k) => steps[k])
    if (allDone && !celebratedRef.current) {
      celebratedRef.current = true
      setDismissedForever(true)
      showSuccess('🎉 ¡TARS está listo! Ya puedes gestionar tu operación completa.', {
        duration: 5000,
        celebration: true
      })
    }
    writeStorage({ steps, dismissedForever: dismissedForever || allDone })
  }, [steps, dismissedForever, showSuccess])

  const markStepDone = useCallback((key) => {
    setSteps((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
  }, [])

  const allDone = STEP_KEYS.every((k) => steps[k])

  const value = { steps, stepKeys: STEP_KEYS, allDone, dismissedForever, markStepDone }

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
