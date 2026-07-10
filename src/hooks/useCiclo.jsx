import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CicloContext = createContext(null)
const STORAGE_KEY = 'tars_selected_ciclo_id'

export function CicloProvider({ children }) {
  const [ciclos, setCiclos] = useState([])
  const [selectedCicloId, setSelectedCicloIdState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? Number(saved) : null
  })
  const [loading, setLoading] = useState(true)

  const fetchCiclos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ciclos')
      .select('*')
      .order('inicio', { ascending: false })
    if (!error && data) {
      setCiclos(data)
      setSelectedCicloIdState((current) => {
        if (current && data.some((c) => c.id === current)) return current
        const activo = data.find((c) => c.estado === 'activo') ?? data[0]
        return activo ? activo.id : null
      })
    }
    setLoading(false)
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
      value={{ ciclos, selectedCiclo, selectedCicloId, setSelectedCicloId, loading, refetch: fetchCiclos }}
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
