'use client'

import { useRef, useEffect } from 'react'
import { useChat, Message } from '@/hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'
import { Share, Menu, Sparkles, Code, FileText, Image as ImageIcon, Info } from 'lucide-react'

interface ChatWindowProps {
  isSidebarOpen?: boolean
  sessionId?: string
  onToggleSidebar?: () => void
}

const SUGGESTIONS = [
  { icon: <Code size={18} />, text: 'Write a python script' },
  { icon: <FileText size={18} />, text: 'Summarize a document' },
  { icon: <Sparkles size={18} />, text: 'Brainstorm ideas' },
  { icon: <ImageIcon size={18} />, text: 'Analyze this image' },
]

export function ChatWindow({ sessionId, isSidebarOpen, onToggleSidebar }: ChatWindowProps) {
  const { messages, sendMessage, streaming, error } = useChat(sessionId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      alert('URL copied to clipboard!')
    }
  }

  const handleSuggestionClick = (text: string) => {
    sendMessage(text)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] relative">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 sticky top-0 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`${isSidebarOpen ? "md:hidden" : ""} p-2 -ml-2 text-zinc-400 hover:text-zinc-100 transition-colors rounded-lg`}
            >
              <Menu size={20} />
            </button>
          )}
          <h1 className="text-zinc-300 font-medium text-sm flex items-center gap-2">
            Beam 
            <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-semibold border border-zinc-700/50 uppercase tracking-widest">
              Beta
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {sessionId && (
            <button
              onClick={handleShare}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-colors"
              title="Share Chat"
            >
              <Share size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-custom">
        {messages.length === 0 && !streaming ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center mb-6 shadow-2xl flex-shrink-0">
              <Sparkles className="w-8 h-8 text-zinc-100" />
            </div>
            <h2 className="text-2xl font-medium text-zinc-100 mb-8 tracking-tight">How can I help you today?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
              {SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left group"
                >
                  <div className="p-2 rounded-xl bg-zinc-800/50 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-700/50 transition-colors">
                    {suggestion.icon}
                  </div>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    {suggestion.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-6 p-4 sm:p-6 pt-6">
            {error && (
              <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-200 text-sm flex items-start gap-3">
                <Info size={16} className="mt-0.5 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {messages.map((message: Message, index: number) => {
              const isLastAssistantMessage = streaming && index === messages.length - 1 && message.role === 'assistant'
              return (
                <MessageBubble
                  key={index}
                  content={message.content}
                  role={message.role}
                  isStreaming={isLastAssistantMessage}
                />
              )
            })}

            <div className="h-32 md:h-48 flex-shrink-0" />
            <div ref={messagesEndRef} className="h-0" />
          </div>
        )}
      </div>

      {/* Input Overlay */}
      <InputBar onSend={sendMessage} isLoading={streaming} />
    </div>
  )
}
