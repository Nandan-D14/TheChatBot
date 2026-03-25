import { useState, useCallback, useRef } from 'react'

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

/**
 * Custom hook for managing chat with SSE streaming
 */
export function useChat(sessionId: string): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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
    setMessages(prev => [...prev, userMessage])

    // Add placeholder for assistant response
    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    let buffer = ''

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
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
  }, [sessionId, messages])

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
