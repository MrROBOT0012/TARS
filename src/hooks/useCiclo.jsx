import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CicloContext = createContext(null)
const STORAGE_KEY = 'tars_selected_ciclo_id'
const QUERY_TIMEOUT_MS = 10000

export function CicloProvider({ children }) {
  const [ciclos, setCiclos] = useState([])
  const [selectedCicloId, setSelectedCicloIdState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? Number(saved) : null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCiclos = useCallback(async () => {
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)
    try {
      const { data, error: err } = await supabase
        .from('ciclos')
        .select('*')
        .order('inicio', { ascending: false })
        .abortSignal(controller.signal)
      if (err) throw err
      setCiclos(data ?? [])
      setSelectedCicloIdState((current) => {
        if (current && data.some((c) => c.id === current)) return current
        const activo = data.find((c) => c.estado === 'activo') ?? data[0]
        return activo ? activo.id : null
      })
    } catch (err) {
      const message =
        err?.name === 'AbortError'
          ? 'La consulta de ciclos tardó demasiado (más de 10s). Verifica tu conexión o los permisos (RLS) de la tabla "ciclos".'
          : err?.message ?? 'Error desconocido al consultar ciclos.'
      setError({ message })
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCiclos()
  }, [fetchCiclos])

  const setSelectedCicloId = useCallback((id) => {
    setSelectedCicloIdState(id)
    if (id) localStorage.setItem(STORAGE_KEY, String(id))
  }, [])

  const selectedCiclo = ciclos.find((c) => c.id === selectedCicloId) ?? null

  return (
    <CicloContext.Provider
      value={{ ciclos, selectedCiclo, selectedCicloId, setSelectedCicloId, loading, error, refetch: fetchCiclos }}
    >
      {children}
    </CicloContext.Provider>
  )
}

export function useCiclo() {
  const ctx = useContext(CicloContext)
  if (!ctx) throw new Error('useCiclo must be used within CicloProvider')
  return ctx
}
