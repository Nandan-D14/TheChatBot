'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SessionItem } from './SessionItem'
import { Session } from '@/hooks/useSessions'
import { Plus, MessageSquare, AlertCircle, X } from 'lucide-react'
import { getUserIdSafe } from '@/lib/userIdentity'


const REQUEST_TIMEOUT_MS = 25000

interface SidebarProps {
  onSessionChange?: (sessionId: string) => void
}

export function Sidebar({ onSessionChange }: SidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    setError(null)
    setLoading(true)

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort('request-timeout'), REQUEST_TIMEOUT_MS)

    try {
      const userId = getUserIdSafe()
      if (!userId) {
        setError('User not authenticated. Please refresh the page.')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sessions/?user_id=${userId}`,
        { signal: controller.signal }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        let detail = `${response.status} ${response.statusText}`
        try {
          const body = await response.json()
          if (body?.detail) {
            detail = body.detail
          }
        } catch {
          // Keep fallback detail when response body is not JSON.
        }
        throw new Error(`Failed to load sessions: ${detail}`)
      }

      const data = await response.json()
      // Sort by newest first
      const sorted = (Array.isArray(data) ? data : data.documents || []).sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setSessions(sorted)
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.')
      } else if (error.message) {
        setError(error.message)
      } else {
        setError('Failed to load sessions. Please try again.')
      }
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewChat = async () => {
    setError(null)
    setDeleteError(null)
    setCreating(true)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort('request-timeout'), REQUEST_TIMEOUT_MS)

    try {
      const userId = getUserIdSafe()
      if (!userId) {
        throw new Error('User not authenticated. Please refresh the page.')
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sessions/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, title: 'New Chat' }),
          signal: controller.signal
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        let detail = `${response.status} ${response.statusText}`
        try {
          const body = await response.json()
          if (body?.detail) {
            detail = body.detail
          }
        } catch {
          // Keep fallback detail when response body is not JSON.
        }
        throw new Error(`Failed to create chat: ${detail}`)
      }

      const newSession = await response.json()

      await loadSessions()

      if (onSessionChange) {
        onSessionChange(newSession.session_id)
      } else {
        router.push(`/chat/${newSession.session_id}`)
      }
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.')
      } else if (error.message) {
        setError(error.message)
      } else {
        setError('Failed to create chat. Please try again.')
      }
      console.error('Failed to create session:', error)
    } finally {
      setCreating(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    setDeleteError(null)
    setDeletingId(sessionId)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort('request-timeout'), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sessions/${sessionId}`,
        { method: 'DELETE', signal: controller.signal }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status} ${response.statusText}`)
      }

      setSessions(sessions.filter(s => s.session_id !== sessionId))
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        setDeleteError('Request timed out. Please check your connection and try again.')
      } else if (error.message) {
        setDeleteError(error.message)
      } else {
        setDeleteError('Failed to delete session. Please try again.')
      }
      console.error('Failed to delete session:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSessionClick = (sessionId: string) => {
    if (onSessionChange) {
      onSessionChange(sessionId)
    } else {
      router.push(`/chat/${sessionId}`)
    }
  }

  return (
    <div className="w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen transition-colors">
      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={createNewChat}
          disabled={creating}
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-gray-800 dark:text-gray-200 px-4 py-3 rounded-xl flex items-center gap-3 transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className={`bg-blue-600 text-white rounded-lg p-1.5 ${creating ? 'animate-spin' : 'group-hover:scale-105'} transition-transform`}>
            {creating ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Plus size={16} strokeWidth={3} />
            )}
          </div>
          <span className="font-medium">{creating ? 'Creating...' : 'New chat'}</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Delete Error Display */}
      {deleteError && (
        <div className="mx-4 mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-orange-500 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-orange-700 dark:text-orange-400 flex-1">{deleteError}</p>
          <button
            onClick={() => setDeleteError(null)}
            className="text-orange-500 hover:text-orange-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* History Header */}
      <div className="px-5 py-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent</h3>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
            <span className="text-sm">Loading history...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
            <MessageSquare className="opacity-20" size={32} />
            <p>No recent chats</p>
          </div>
        ) : (
          sessions.map(session => (
            <SessionItem
              key={session.session_id}
              session={session}
              onClick={() => handleSessionClick(session.session_id)}
              onDelete={() => deleteSession(session.session_id)}
              isDeleting={deletingId === session.session_id}
            />
          ))
        )}
      </div>
    </div>
  )
}
