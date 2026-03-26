'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Paperclip } from 'lucide-react'

interface InputBarProps {
  onSend: (message: string) => void
  isLoading?: boolean
}

export function InputBar({ onSend, isLoading }: InputBarProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (input.trim() && !isLoading) {
      onSend(input.trim())
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-12 pb-6 px-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-end gap-2 bg-zinc-900 overflow-hidden rounded-[24px] p-2 border border-zinc-800 shadow-2xl focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-700/50 transition-all">
        <button
          type="button"
          className="p-3 mb-0.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors flex-shrink-0"
          onClick={() => {}}
        >
          <Paperclip size={20} />
        </button>
        
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Beam..."
          className="w-full max-h-[200px] min-h-[44px] bg-transparent text-zinc-100 placeholder:text-zinc-500 resize-none outline-none py-3 px-2 scrollbar-custom text-[15px]"
          disabled={isLoading}
          rows={1}
        />
        
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-3 mb-0.5 bg-zinc-100 text-zinc-900 rounded-full hover:bg-white disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex-shrink-0"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
        </button>
      </form>
      <div className="text-center mt-3">
        <p className="text-[10px] text-zinc-600 font-medium tracking-wide">AI models can make mistakes. Consider verifying important information.</p>
      </div>
    </div>
  )
}
