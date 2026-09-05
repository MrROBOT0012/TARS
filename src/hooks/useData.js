import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getFriendlyErrorMessage } from '../lib/errorHandler'

const CACHE_PREFIX = 'tars_cache_'
const QUERY_TIMEOUT_MS = 10000

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data))
  } catch {
    /* storage full or unavailable, ignore */
  }
}

/** Wipes every cached query result — called on logout (manual or session-expiry) so a signed-out session can't leak financial data via localStorage inspection. */
export function clearAllCache() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(CACHE_PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    /* storage unavailable, ignore */
  }
}

/**
 * Fetch rows from a Supabase table with in-memory + localStorage caching
 * so the last successful result is available offline.
 *
 * filters: array of [column, operator, value] tuples, e.g. [['ciclo_id', 'eq', 5]]
 *
 * `filters` and `orderBy` are read through refs updated every render but kept
 * out of the fetchData dependency array — the caller usually passes fresh
 * object/array literals each render, and including them directly here would
 * recreate fetchData (and therefore its effect) every render, causing a
 * refetch loop that never lets `loading` settle. `cacheKey` (a stable string
 * derived from their content) is what actually drives refetching.
 */
export function useTable(table, { select = '*', filters = [], orderBy = null, enabled = true } = {}) {
  const cacheKey = `${table}:${JSON.stringify({ select, filters, orderBy })}`
  const [data, setData] = useState(() => readCache(cacheKey) ?? [])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const [stale, setStale] = useState(false)
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const orderByRef = useRef(orderBy)
  orderByRef.current = orderBy

  const fetchData = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)

    try {
      let query = supabase.from(table).select(select).abortSignal(controller.signal)
      for (const [column, op, value] of filtersRef.current) {
        query = query[op](column, value)
      }
      if (orderByRef.current) {
        query = query.order(orderByRef.current.column, { ascending: orderByRef.current.ascending ?? true })
      }
      const { data: rows, error: err } = await query
      if (err) throw err
      setData(rows ?? [])
      writeCache(cacheKey, rows ?? [])
      setStale(false)
    } catch (err) {
      setError({ message: getFriendlyErrorMessage(err) })
      const cached = readCache(cacheKey)
      if (cached) {
        setData(cached)
        setStale(true)
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [table, select, cacheKey, enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('online', fetchData)
    return () => window.removeEventListener('online', fetchData)
  }, [fetchData, enabled])

  return { data, loading, error, stale, refetch: fetchData }
}

export async function insertRow(table, values) {
  const { data, error } = await supabase.from(table).insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateRow(table, id, values) {
  const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  return online
}
