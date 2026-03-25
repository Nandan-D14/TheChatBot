import { Message } from '@/hooks/useChat'
import { Bot, User } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex max-w-[80%] md:max-w-[70%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-800 text-green-400'}`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>
        
        {/* Bubble */}
        <div
          className={`flex flex-col rounded-2xl px-5 py-3.5 shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-sm'
          }`}
        >
          <div className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
            {message.content}
          </div>
        </div>
      </div>
    </div>
  )
}
