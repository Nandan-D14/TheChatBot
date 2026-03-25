import { useState, useCallback, useEffect } from 'react'

export interface Session {
  session_id: string
  title: string
  created_at: string
}

export interface UseSessionsReturn {
  sessions: Session[]
  loading: boolean
  error: string | null
  createSession: (title?: string) => Promise<string | null>
  deleteSession: (sessionId: string) => Promise<void>
  refreshSessions: () => Promise<void>
}

/**
 * Custom hook for managing chat sessions
 */
export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getUserId = () => {
    return localStorage.getItem('temp_user_id') || localStorage.getItem('user_id')
  }

  const refreshSessions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const userId = getUserId()
      if (!userId) {
        setSessions([])
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sessions?user_id=${userId}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setSessions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions')
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createSession = useCallback(async (title?: string): Promise<string | null> => {
    try {
      const userId = getUserId()
      if (!userId) return null

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sessions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, title: title || 'New Chat' })
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Refresh sessions list
      await refreshSessions()
      
      return data.session_id
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session')
      return null
    }
  }, [refreshSessions])

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sessions/${sessionId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Remove from local state
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete session')
    }
  }, [])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  return {
    sessions,
    loading,
    error,
    createSession,
    deleteSession,
    refreshSessions
  }
}
