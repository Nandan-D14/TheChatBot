'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { ensureTempUserIdSafe, getUserIdSafe } from '@/lib/userIdentity'


const REQUEST_TIMEOUT_MS = 60000

export default function ChatPage() {
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Ensure a usable identity even when localStorage is restricted.
    ensureTempUserIdSafe()

    // Create a new session if none exists
    createNewSession()
  }, [])

  const createNewSession = async () => {
    setSessionError(null)
    setIsCreatingSession(true)

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
          body: JSON.stringify({ user_id: userId }),
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
        throw new Error(`Session creation failed: ${detail}`)
      }

      const data = await response.json()
      router.replace(`/chat/${data.session_id}`)
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        setSessionError('Request timed out. Please check your connection and try again.')
      } else if (error.message) {
        setSessionError(error.message)
      } else {
        setSessionError('Failed to create session. Please try again.')
      }

      console.error('Failed to create session:', error)

      // Fallback for demo purposes - still allow user to proceed
      // But only if no serious error (like domain not configured)
      if (!error.name || error.name !== 'TypeError') {
        router.replace('/chat/demo_session')
      }
    } finally {
      setIsCreatingSession(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto p-6">
        {isCreatingSession ? (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Creating your chat session...</p>
          </>
        ) : sessionError ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-left">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">Failed to create session</h3>
                  <p className="text-sm text-red-600 dark:text-red-300">{sessionError}</p>
                </div>
              </div>
            </div>
            <button
              onClick={createNewSession}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="text-muted-foreground">Preparing chat...</p>
        )}
      </div>
    </div>
  )
}
