import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './useToast.jsx'

const OnboardingContext = createContext(null)
const STORAGE_KEY = 'tars_onboarding_v2'

const STEP_KEYS = ['finca', 'ciclo', 'campo', 'cosecha', 'bascula', 'secado', 'embodegado', 'turno', 'venta']
const STEP_TABLES = {
  finca: 'fincas',
  ciclo: 'ciclos',
  campo: 'gastos_campo',
  cosecha: 'cosechas',
  bascula: 'basculas',
  secado: 'secados',
  embodegado: 'embodegados',
  turno: 'turnos_trillo',
  venta: 'ventas'
}
const SKIPPABLE_KEYS = new Set(['campo', 'cosecha'])

function emptyStatuses() {
  return STEP_KEYS.reduce((acc, key) => ({ ...acc, [key]: 'pending' }), {})
}

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
  const [statuses, setStatuses] = useState(saved?.statuses ?? emptyStatuses())
  const [highlightPill, setHighlightPill] = useState(false)
  const celebratedRef = useRef(saved?.dismissedForever ?? false)

  useEffect(() => {
    if (dismissedForever) return
    let cancelled = false
    async function verify() {
      const results = await Promise.all(
        STEP_KEYS.map((key) => supabase.from(STEP_TABLES[key]).select('id', { count: 'exact', head: true }))
      )
      if (cancelled) return
      setStatuses((prev) => {
        let changed = false
        const next = { ...prev }
        STEP_KEYS.forEach((key, i) => {
          const { count, error } = results[i]
          if (!error && (count ?? 0) > 0 && next[key] !== 'done') {
            next[key] = 'done'
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
    const allResolved = STEP_KEYS.every((k) => statuses[k] !== 'pending')
    if (allResolved && !celebratedRef.current) {
      celebratedRef.current = true
      setDismissedForever(true)
      showSuccess('🎉 ¡TARS está listo! Ya puedes gestionar tu operación completa.', {
        duration: 5000,
        celebration: true
      })
    }
    writeStorage({ statuses, dismissedForever: dismissedForever || allResolved })
  }, [statuses, dismissedForever, showSuccess])

  const markStepDone = useCallback((key) => {
    setStatuses((prev) => (prev[key] === 'done' ? prev : { ...prev, [key]: 'done' }))
  }, [])

  const skipStep = useCallback((key) => {
    if (!SKIPPABLE_KEYS.has(key)) return
    setStatuses((prev) => (prev[key] === 'pending' ? { ...prev, [key]: 'skipped' } : prev))
  }, [])

  const triggerPillHighlight = useCallback(() => {
    setHighlightPill(true)
    setTimeout(() => setHighlightPill(false), 3000)
  }, [])

  const allDone = STEP_KEYS.every((k) => statuses[k] !== 'pending')
  const activeStep = STEP_KEYS.find((k) => statuses[k] === 'pending') ?? null

  const value = {
    statuses,
    stepKeys: STEP_KEYS,
    skippableKeys: SKIPPABLE_KEYS,
    activeStep,
    allDone,
    dismissedForever,
    highlightPill,
    markStepDone,
    skipStep,
    triggerPillHighlight
  }

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
