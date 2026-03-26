'use client'

import { Bot, User } from 'lucide-react'

interface MessageBubbleProps {
  content: string
  role: 'user' | 'assistant'
  isStreaming?: boolean
}

export function MessageBubble({ content, role, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isUser ? 'bg-zinc-800 text-zinc-300' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>
        
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
          <span className="text-xs font-medium text-zinc-500 px-1">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
          <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${
            isUser 
              ? 'bg-zinc-800/80 text-zinc-100 rounded-tr-sm border border-zinc-700/50' 
              : 'bg-zinc-900/50 text-zinc-300 rounded-tl-sm border border-zinc-800/50'
          }`}>
            <div className="whitespace-pre-wrap">
              {content}
              {isStreaming && <span className="ml-1 inline-block w-1.5 h-3.5 bg-zinc-400 animate-pulse align-middle" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
