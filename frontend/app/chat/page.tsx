'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { AlertCircle, X } from 'lucide-react'

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated (simplified for now)
    // In production, check Appwrite auth state
    const userId = localStorage.getItem('user_id')
    
    if (!userId) {
      // For demo, create a temporary user ID
      let tempUserId = localStorage.getItem('temp_user_id')
      if (!tempUserId) {
        tempUserId = 'demo_user_' + Math.random().toString(36).substring(7)
        localStorage.setItem('temp_user_id', tempUserId)
      }
    }

    // Create a new session if none exists
    createNewSession()
  }, [])

  const createNewSession = async () => {
    setSessionError(null)
    setIsCreatingSession(true)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const userId = localStorage.getItem('temp_user_id') || localStorage.getItem('user_id')

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
        throw new Error(`Session creation failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setSessionId(data.session_id)
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
        setSessionId('demo_session')
      }
    } finally {
      setIsCreatingSession(false)
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You can continue in demo mode, but chats won't be saved.
              </p>
              <button
                onClick={() => setSessionId('demo_session')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue in Demo Mode
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
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar onSessionChange={handleSessionChange} />
      </div>

      {/* Main Chat Area */}
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
