/**
 * API helper functions for communicating with the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  session_id: string
  prompt: string
  history: ChatMessage[]
}

export interface Session {
  session_id: string
  user_id: string
  title: string
  created_at: string
}

/**
 * Send a chat message and get streaming response
 */
export async function* streamChat(request: ChatRequest) {
  const response = await fetch(`${API_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })

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
      if (line.startsWith('data: ')) {
        const data = line.replace('data: ', '')
        if (data !== '[DONE]') {
          try {
            yield JSON.parse(data)
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

/**
 * Send a chat message and get non-streaming response
 */
export async function sendChat(request: ChatRequest): Promise<string> {
  const response = await fetch(`${API_URL}/chat/non-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data.response
}

/**
 * Create a new session
 */
export async function createSession(userId: string, title?: string): Promise<Session> {
  const response = await fetch(`${API_URL}/sessions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, title: title || 'New Chat' })
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * Get all sessions for a user
 */
export async function getSessions(userId: string): Promise<Session[]> {
  const response = await fetch(`${API_URL}/sessions/?user_id=${userId}`)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
}

/**
 * Get messages for a session
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/messages`)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data.messages.map((m: any) => ({
    role: m.role,
    content: m.content
  }))
}
