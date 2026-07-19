import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './useToast.jsx'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { showError } = useToast()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const hadSessionRef = useRef(false)
  const manualSignOutRef = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      hadSessionRef.current = !!data.session
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (hadSessionRef.current && !newSession && !manualSignOutRef.current) {
        showError('Tu sesión venció. Por favor vuelve a iniciar sesión.')
      }
      manualSignOutRef.current = false
      hadSessionRef.current = !!newSession
      setSession(newSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [showError])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    manualSignOutRef.current = true
    await supabase.auth.signOut()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
