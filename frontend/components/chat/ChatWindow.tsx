'use client'

import { useRef, useEffect } from 'react'
import { useChat, Message } from '@/hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'
import { Sparkles, Loader2 } from 'lucide-react'

interface ChatWindowProps {
  sessionId: string
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
  const { messages, sendMessage, streaming, error } = useChat(sessionId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streaming])

  const handleSend = async (prompt: string) => {
    await sendMessage(prompt)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center px-6 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-10">
        <h1 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Sparkles className="text-blue-500 h-5 w-5" />
          TheChatBot
        </h1>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-gray-500 mt-32 animate-in fade-in duration-500">
              <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Sparkles size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">How can I help you today?</h2>
              <p className="text-sm text-gray-400">Send a message to start the conversation</p>
            </div>
          )}
          
          {messages.map((message: Message, index: number) => (
            <MessageBubble key={index} message={message} />
          ))}
          
          {streaming && (
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 p-4 w-fit">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm font-medium animate-pulse">Thinking...</span>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/50 text-sm flex items-start gap-3">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
               <div>
                 <p className="font-semibold mb-1">An error occurred</p>
                 <p className="opacity-90">{error}</p>
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <InputBar onSend={handleSend} disabled={streaming} />
    </div>
  )
}
