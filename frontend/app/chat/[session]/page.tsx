'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { AlertCircle } from 'lucide-react'

const REQUEST_TIMEOUT_MS = 60000

export default function SessionChatPage() {
  const params = useParams<{ session: string }>()
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    const rawSession = params?.session
    const normalizedSession = typeof rawSession === 'string' ? rawSession.trim() : ''

    if (!normalizedSession) {
      setSessionError('Invalid session URL. Redirecting to a new chat...')
      router.replace('/chat')
      return
    }

    validateSession(normalizedSession)
  }, [params, router])

  const validateSession = async (id: string) => {
    setSessionError(null)
    setIsValidating(true)

    if (id === 'demo_session') {
      setSessionId(id)
      setIsValidating(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort('request-timeout'), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/${id}`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.status === 404) {
        setSessionError('Session not found. Redirecting to a new chat...')
        setTimeout(() => router.replace('/chat'), 1200)
        return
      }

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
        throw new Error(`Failed to load session: ${detail}`)
      }

      setSessionId(id)
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        setSessionError('Request timed out. Please check your connection and try again.')
      } else if (error.message) {
        setSessionError(error.message)
      } else {
        setSessionError('Failed to load session. Please try again.')
      }

      console.error('Failed to load session:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleSessionChange = (newSessionId: string) => {
    setSessionId(newSessionId)
    router.push(`/chat/${newSessionId}`)
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          {isValidating ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading your session...</p>
            </>
          ) : sessionError ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-left">
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">Failed to load session</h3>
                    <p className="text-sm text-red-600 dark:text-red-300">{sessionError}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.replace('/chat')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start New Chat
              </button>
            </div>
          ) : (
            <p className="text-muted-foreground">Preparing chat...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <div className="w-64 flex-shrink-0">
        <Sidebar onSessionChange={handleSessionChange} />
      </div>

      <div className="flex-1 flex flex-col">
        {sessionId === 'demo_session' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle size={16} />
              <span>Demo Mode: Chats are not saved. Connect backend to enable full functionality.</span>
            </div>
          </div>
        )}
        <ChatWindow sessionId={sessionId} />
      </div>
    </div>
  )
}
