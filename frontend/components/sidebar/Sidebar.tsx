'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Plus, Loader2, PanelLeftClose } from 'lucide-react'
import { SessionItem } from './SessionItem'
import { getAuthHeaders, hasValidAccessKey } from '@/lib/userIdentity'

const SESSION_FETCH_TIMEOUT_MS = 65000
const SESSION_FETCH_RETRY_DELAY_MS = 1200

interface Session {
  session_id: string
  title: string
  created_at: string
}

interface SidebarProps {
  onSessionChange?: (sessionId: string) => void
  onClose?: () => void
}

export function Sidebar({ onSessionChange, onClose }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (hasValidAccessKey()) {
      fetchSessions()
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchSessions = async () => {
    setIsLoading(true)

    const fetchOnce = async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort('request-timeout'), SESSION_FETCH_TIMEOUT_MS)

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/sessions?user_id=shared-app-user`,
          { headers: { ...getAuthHeaders() }, signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.status}`)
        }

        const data = await response.json()
        setSessions(data)
      } finally {
        clearTimeout(timeoutId)
      }
    }

    try {
      await fetchOnce()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        try {
          await new Promise((resolve) => setTimeout(resolve, SESSION_FETCH_RETRY_DELAY_MS))
          await fetchOnce()
        } catch (retryError) {
          console.error('Failed to fetch sessions after retry:', retryError)
        }
      } else {
        console.error('Failed to fetch sessions:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = () => {
    if (onSessionChange) {
      router.push('/chat')
    } else {
      router.push('/chat')
    }
    onClose?.()
  }

  const selectSession = (id: string) => {
    if (onSessionChange) {
      onSessionChange(id)
    } else {
      router.push(`/chat/${id}`)
      onClose?.()
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (deletingSessionId) {
      return
    }

    const confirmed = typeof window !== 'undefined' ? window.confirm('Delete this chat?') : false
    if (!confirmed) {
      return
    }

    setDeletingSessionId(sessionId)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sessions/${sessionId}?user_id=shared-app-user`,
        { method: 'DELETE', headers: { ...getAuthHeaders() } }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status}`)
      }

      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId))

      if (pathname === `/chat/${sessionId}`) {
        router.push('/chat')
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    } finally {
      setDeletingSessionId(null)
    }
  }

  return (
    <div className="w-full h-full bg-[#050505] md:bg-[#070707] border-r border-zinc-800/40 flex flex-col pt-3 pb-2 text-zinc-100">
      {/* Header and Mobile Close */}
      <div className="px-3 mb-4 flex items-center justify-between">
        <button 
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-colors flex items-center gap-2"
          title="Close Sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
        <button
          onClick={handleNewChat}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-colors"
          title="New Chat"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="px-5 mb-2 mt-2">
        <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase">Recent</h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-custom px-2 space-y-0.5">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center p-4">
            <p className="text-xs text-zinc-600">No recent chats</p>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.session_id}
              id={session.session_id}
              title={session.title}
              createdAt={session.created_at}
              onClick={() => selectSession(session.session_id)}
              onDelete={() => handleDeleteSession(session.session_id)}
              isDeleting={deletingSessionId === session.session_id}
            />
          ))
        )}
      </div>
    </div>
  )
}
