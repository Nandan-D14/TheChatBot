'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { AlertCircle } from 'lucide-react'
import { getAuthHeaders, hasValidAccessKey } from '@/lib/userIdentity'

const REQUEST_TIMEOUT_MS = 60000
function toErrorDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (detail === null || detail === undefined) return '';
  try { return JSON.stringify(detail); } catch { return String(detail); }
}

export default function SessionChatPage() {
  const params = useParams<{ session: string }>()
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    if (!hasValidAccessKey()) {
      router.replace('/login')
      return
    }
    const rawSession = params?.session
    const normalizedSession = typeof rawSession === 'string' ? rawSession.trim() : ''
    if (!normalizedSession) {
      setSessionError('Invalid session URL. Redirecting...')
      router.replace('/chat')
      return
    }
    
    // Auto-close sidebar on mobile by default
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }

    validateSession(normalizedSession)
  }, [params, router])

  const validateSession = async (id: string) => {
    setSessionError(null)
    setIsValidating(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort('request-timeout'), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/${id}`, {
        headers: { ...getAuthHeaders() },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (response.status === 404) {
        setSessionError('Session not found. Redirecting to a new chat...')
        setTimeout(() => router.replace('/chat'), 1200)
        return
      }
      if (!response.ok) {
        let detail = `${response.status}`
        try {
          const body = await response.json()
          if (body?.detail) detail = toErrorDetail(body.detail)
        } catch {}
        throw new Error(`Failed to load session: ${detail}`)
      }
      setSessionId(id)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') setSessionError('Request timed out.')
      else if (error.message) setSessionError(error.message)
      else setSessionError('Failed to load session.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSessionChange = (newSessionId: string) => {
    setSessionId(newSessionId)
    if (window.innerWidth < 768) setIsSidebarOpen(false)
    router.push(`/chat/${newSessionId}`)
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-[#0a0a0a]">
        <div className="text-center max-w-md mx-auto p-6">
          {isValidating ? (
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400 mx-auto"></div>
              <p className="mt-4 text-zinc-500 text-sm">Loading session...</p>
            </div>
          ) : sessionError ? (
            <div className="space-y-6">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-left">
                    <h3 className="font-medium text-red-300 mb-1">Access Denied</h3>
                    <p className="text-sm text-red-400/80">{sessionError}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.replace('/chat')}
                className="px-5 py-2.5 bg-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-700 transition-colors text-sm font-medium"
              >
                Go to new chat
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] bg-[#0a0a0a] text-zinc-100 overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 flex-shrink-0
          transform transition-all duration-300 ease-in-out
          md:relative
          ${isSidebarOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:-ml-72'}
        `}
      >
        <Sidebar onSessionChange={handleSessionChange} onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative w-full min-w-0">
        <ChatWindow sessionId={sessionId} isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      </div>
    </div>
  )
}
