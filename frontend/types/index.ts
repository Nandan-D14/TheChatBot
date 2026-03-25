/**
 * Shared TypeScript types for TheChatBot
 */

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface Session {
  session_id: string
  user_id: string
  title: string
  created_at: string
}

export interface ChatRequest {
  session_id: string
  prompt: string
  history: Message[]
  temperature?: number
  max_tokens?: number
}

export interface ChatResponse {
  response: string
  session_id: string
}

export interface User {
  user_id: string
  email?: string
  name?: string
}

export interface Memory {
  user_id: string
  summary: string
  updated_at?: string
}
