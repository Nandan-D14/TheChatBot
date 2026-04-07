'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Plus } from 'lucide-react'

interface InputBarProps {
  onSend: (message: string) => void
  isLoading?: boolean
  isCentered?: boolean
}

export function InputBar({ onSend, isLoading, isCentered }: InputBarProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`
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
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      const cursorPosition = textareaRef.current?.selectionStart || input.length
      const textBefore = input.slice(0, cursorPosition)
      const textAfter = input.slice(cursorPosition)
      setInput(textBefore + '\n' + textAfter)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = cursorPosition + 1
          textareaRef.current.selectionEnd = cursorPosition + 1
        }
      }, 0)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit} className={`w-full max-w-[700px] mx-auto relative flex flex-col bg-[#2A2A2A] rounded-[24px] p-3 transition-all min-h-[60px] focus-within:ring-1 focus-within:ring-zinc-600 ${isCentered ? 'shadow-sm' : 'shadow-lg border border-[#3A3A3A]'}`}>
      {/* Textarea */}
      <div className="flex flex-col relative w-full mb-1">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you today?"
          className={`w-full bg-transparent text-[#E8E2D9] placeholder:text-zinc-500 resize-none outline-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] max-h-[400px] px-2 pt-1 pb-2 text-[15px]`}
          disabled={isLoading}
          rows={1}
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      </div>
      
      {/* Bottom tools row */}
      <div className="flex items-center justify-between mt-auto">
        <button
          type="button"
          className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors ml-1"
          onClick={() => {}}
        >
          <Plus size={22} strokeWidth={2} />
        </button>

        <div className="flex items-center gap-1.5 mr-1">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-[#A1A1AA] cursor-pointer hover:bg-[#3A3A3A] hover:text-zinc-200 rounded-lg transition-colors h-8 text-[13px] font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
            Qwen 2.5 <span className="opacity-70 font-normal">Extended</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-70"><path d="m6 9 6 6 6-6"/></svg>
          </div>

          <div className="flex items-center ml-2 border-l border-[#3A3A3A] pl-2">
            {input.trim() ? (
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 bg-zinc-200 text-black rounded-full hover:bg-white transition-all flex items-center justify-center shadow-md disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin text-black" /> : <Send size={16} className="ml-0.5 text-black" />}
              </button>
            ) : (
              <button
                type="button"
                className="w-8 h-8 text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-center hover:bg-[#3A3A3A] rounded-full"
                disabled
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2A3 3 0 0 0 9 5v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  )

  if (isCentered) {
    return (
      <div className="w-full">
        {formContent}
      </div>
    )
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#1E1E1E] pt-8 pb-4 px-4 overflow-hidden border-t border-[#2A2A2A]">
      {formContent}
      <div className="text-center mt-3 h-[20px]">
        <p className="text-[12px] text-zinc-500 font-normal">AI models can make mistakes. Consider verifying important information.</p>
      </div>
    </div>
  )
}
