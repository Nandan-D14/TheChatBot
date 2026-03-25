'use client'

import { useState, KeyboardEvent, FormEvent, useRef, useEffect } from 'react'
import { SendHorizontal } from 'lucide-react'

interface InputBarProps {
  onSend: (message: string) => Promise<void>
  disabled?: boolean
}

export function InputBar({ onSend, disabled = false }: InputBarProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    
    if (!input.trim() || disabled) return
    
    const message = input.trim()
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    await onSend(message)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-950 dark:via-gray-950 pt-8 pb-6">
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 max-w-4xl mx-auto">
        <div className="relative flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all overflow-hidden">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask TheChatBot anything..."
            disabled={disabled}
            className="w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-[15px] outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50 max-h-[200px]"
            rows={1}
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="absolute right-2 bottom-2 p-2 rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:cursor-not-allowed"
            title="Send message"
          >
            {disabled ? (
              <div className="h-5 w-5 flex items-center justify-center">
                <span className="animate-ping h-2 w-2 rounded-full bg-white"></span>
              </div>
            ) : (
              <SendHorizontal size={18} className="ml-0.5" />
            )}
          </button>
        </div>
      </form>
      <div className="text-center mt-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">TheChatBot can make mistakes. Consider verifying important information.</span>
      </div>
    </div>
  )
}
