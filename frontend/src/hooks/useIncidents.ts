import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import type { Incident } from '../types/incident'

export function useIncidents(campusId: number | null) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!campusId) return
    try {
      const data = await api.listIncidents({ campus_id: campusId })
      setIncidents(data)
      setError(null)
    } catch {
      setError('Failed to load incidents')
    }
  }, [campusId])

  useEffect(() => {
    if (!campusId) return
    setLoading(true)
    fetch().finally(() => setLoading(false))

    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, [campusId, fetch])

  return { incidents, loading, error, refetch: fetch }
}
