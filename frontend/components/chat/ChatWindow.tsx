'use client'

import { useRef, useEffect } from 'react'
import { useChat, Message } from '@/hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'
import { Share, Menu, Sparkles, Code, FileText, Image as ImageIcon, Info, Edit2, GraduationCap, Coffee, Code2, Play } from 'lucide-react'

interface ChatWindowProps {
  isSidebarOpen?: boolean
  sessionId?: string
  onToggleSidebar?: () => void
}

const SUGGESTIONS = [
  { icon: <Edit2 size={16} className="text-zinc-400" />, text: 'Write' },
  { icon: <GraduationCap size={16} className="text-zinc-400" />, text: 'Learn' },
  { icon: <Code2 size={16} className="text-zinc-400" />, text: 'Code' },
  { icon: <Coffee size={16} className="text-zinc-400" />, text: 'Life stuff' },
  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-400"><path d="M15.4 6.7L18.4 12l-6.3 11-3-5.3L15.4 6.7z" fill="currentColor"/><path d="M12.1 12H24l-3-5.3H9l3 5.3z" fill="#00FF00" opacity="0.8"/><path d="M5.7 12L8.7 6.7 15 17.7l-3 5.3L5.7 12z" fill="#FFC107" opacity="0.8"/></svg>, text: 'From Drive' },
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
    <div className="flex-1 flex flex-col h-full bg-[#1E1E1E] relative">
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
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-4">
          <button className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#161616] border border-[#2B2B2B] hover:bg-[#2B2B2B] hover:border-[#383838] transition-colors text-[13px] font-medium text-zinc-400 font-sans">
            Private
          </button>
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
          <div className="h-full flex flex-col items-center justify-start pt-[25vh] p-4">
            <div className="flex flex-col items-center justify-center mb-8 relative group">
              <div className="flex items-center gap-3">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#E07A5F] group-hover:rotate-45 transition-transform duration-700 ease-in-out">
                  <path d="M12 2L13.5 9.5L21 11L13.5 12.5L12 20L10.5 12.5L3 11L10.5 9.5L12 2Z" fill="currentColor"/>
                </svg>
                <h2 className="text-[38px] md:text-[44px] text-[#E8E2D9] tracking-tight antialiased" style={{ fontFamily: "Playfair Display, Georgia, serif", letterSpacing: "-0.01em" }}>
                  Welcome, Nandan
                </h2>
              </div>
            </div>
            
            <div className="w-full max-w-2xl mb-8 relative z-30">
              <InputBar
                onSend={sendMessage}
                isLoading={streaming}
                isCentered
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-2xl px-4 mt-2">
              {SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-transparent border border-[#3A3A3A] hover:bg-[#2A2A2A] hover:border-[#4A4A4A] transition-all group shadow-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <div className="text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    {suggestion.icon}
                  </div>
                  <span className="text-[13px] font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors whitespace-nowrap">
                    {suggestion.text}
                  </span>
                </button>
              ))}
            </div>
            
            <style jsx>{`
              @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            `}</style>
          </div>
        ) : (
          <div className="max-w-[90%] lg:max-w-4xl mx-auto flex flex-col gap-6 p-4 sm:p-6 pt-6 w-full">
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
      {(!(!messages.length && !streaming)) && (
        <InputBar onSend={sendMessage} isLoading={streaming} />
      )}
    </div>
  )
}
