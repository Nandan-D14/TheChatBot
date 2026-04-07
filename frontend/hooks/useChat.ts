import { useState, useCallback, useRef, useEffect } from 'react'
import { getAuthHeaders } from '@/lib/userIdentity'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface UseChatReturn {
  messages: Message[]
  sendMessage: (prompt: string) => Promise<void>
  streaming: boolean
  error: string | null
  clearMessages: () => void
}

const REQUEST_TIMEOUT_MS = 60000

function buildSessionTitleFromPrompt(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return 'New Chat'
  }

  const maxLen = 48
  if (normalized.length <= maxLen) {
    return normalized
  }

  return `${normalized.slice(0, maxLen - 1)}…`
}

/**
 * Custom hook for managing chat with SSE streaming
 */
export function useChat(sessionId?: string): UseChatReturn {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId || null)
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setActiveSessionId(sessionId || null)
  }, [sessionId])

  const createSessionIfNeeded = useCallback(async (initialTitle?: string): Promise<string> => {
    if (activeSessionId) {
      return activeSessionId
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions?user_id=shared-app-user`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: initialTitle || 'New Chat', user_id: 'shared-app-user' }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const createdSessionId = data?.session_id
    if (!createdSessionId) {
      throw new Error('Failed to create session: missing session id')
    }

    setActiveSessionId(createdSessionId)
    return createdSessionId
  }, [activeSessionId])

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeSessionId || activeSessionId === 'demo_session') {
        setMessages([])
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort('request-timeout'), REQUEST_TIMEOUT_MS)

      try {
        setError(null)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/sessions/${activeSessionId}/messages`,
          { headers: { ...getAuthHeaders() }, signal: controller.signal }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Failed to load chat history: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const sessionMessages = (data.messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
        }))
        setMessages(sessionMessages)
      } catch (e: unknown) {
        clearTimeout(timeoutId)
        if (e instanceof Error && e.name === 'AbortError') {
          setError('Request timed out while loading chat history.')
          return
        }
        setError(e instanceof Error ? e.message : 'Failed to load chat history')
        setMessages([])
      }
    }

    loadMessages()
  }, [activeSessionId])

  const sendMessage = useCallback(async (prompt: string) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setStreaming(true)
    setError(null)

    // Add user message immediately
    const userMessage: Message = { role: 'user', content: prompt }
    const isFirstMessageInSession = messages.length === 0
    const hadSessionBeforeSend = !!activeSessionId
    setMessages(prev => [...prev, userMessage])

    // Add placeholder for assistant response
    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    let buffer = ''

    try {
      const title = buildSessionTitleFromPrompt(prompt)
      const resolvedSessionId = await createSessionIfNeeded(title)

      if (isFirstMessageInSession && hadSessionBeforeSend) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/${resolvedSessionId}`, {
            method: 'PATCH',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title }),
          })
        } catch {
          // Title update should not block chat response.
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/stream`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: resolvedSessionId,
            prompt,
            history: messages,
          }),
          signal: abortControllerRef.current.signal,
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.replace('data: ', ''))
              
              if (data.token && !data.complete) {
                buffer += data.token
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { role: 'assistant', content: buffer },
                ])
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setError(e.message)
      }
    } finally {
      setStreaming(false)
    }
  }, [activeSessionId, createSessionIfNeeded, messages])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    sendMessage,
    streaming,
    error,
    clearMessages,
  }
}
