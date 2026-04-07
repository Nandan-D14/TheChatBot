'use client'

import { Bot, Check, Copy } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageBubbleProps {
  content: string
  role: 'user' | 'assistant'
  isStreaming?: boolean
}

function CodeBlock({ node, inline, className, children, ...props }: any) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!inline && match) {
    return (
      <div className="relative group rounded-[16px] overflow-hidden my-4 border border-[#3A3A3A] bg-[#1a1a1a]">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#2A2A2A] border-b border-[#3A3A3A] text-xs text-zinc-400 font-sans">
          <span className="font-medium uppercase tracking-wider">{match[1]}</span>
          <button 
            onClick={handleCopy} 
            className="hover:text-zinc-200 transition-colors flex items-center gap-1.5 focus:outline-none"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy code'}</span>
          </button>
        </div>
        <div className="p-4 overflow-x-auto text-[14px] font-mono leading-relaxed text-[#E8E2D9] scrollbar-custom">
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      </div>
    )
  }

  return (
    <code className={`${className} bg-[#3A3A3A] px-1.5 py-0.5 rounded-md text-[13px] font-mono text-[#E8E2D9] break-words`} {...props}>
      {children}
    </code>
  )
}

export function MessageBubble({ content, role, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`flex w-full md:max-w-[95%] gap-4 ${isUser ? 'flex-row-reverse md:max-w-[85%]' : 'flex-row'}`}>
        {!isUser && (
          <div className="flex-shrink-0 h-10 w-10 mt-1 rounded-full flex items-center justify-center bg-transparent border border-[#3A3A3A] overflow-hidden shadow-sm self-start">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#E07A5F] transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]">
              <path d="M12 2L13.5 9.5L21 11L13.5 12.5L12 20L10.5 12.5L3 11L10.5 9.5L12 2Z" fill="currentColor"/>
            </svg>
          </div>
        )}
        
        <div className={`flex flex-col gap-1.5 w-full min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
          {!isUser && (
            <span className="text-[13px] font-medium text-zinc-500 px-1 hidden md:block">
              Nandan
            </span>
          )}
          <div className={`text-[15px] leading-relaxed max-w-full overflow-hidden ${
            isUser 
              ? 'px-5 py-3 bg-[#303030] text-[#F5F2ED] rounded-[24px] shadow-sm' 
              : 'py-2 px-1 bg-transparent text-[#E8E2D9]'
          }`}>
            <div className={`max-w-full font-sans ${isUser ? 'whitespace-pre-wrap' : 'prose prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0 prose-img:rounded-xl prose-a:text-blue-400 marker:text-zinc-500'}`}>
              {!isUser ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: CodeBlock,
                    p: ({children}) => <p className="mb-4 last:mb-0 text-[#E8E2D9] leading-7">{children}</p>,
                    ul: ({children}) => <ul className="list-disc ml-6 mb-4 space-y-1.5 marker:text-zinc-500">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal ml-6 mb-4 space-y-1.5 marker:text-zinc-500">{children}</ol>,
                    li: ({children}) => <li className="pl-1 text-[#D4CDC3]">{children}</li>,
                    h1: ({children}) => <h1 className="text-2xl font-bold mb-4 mt-6 text-[#F5F2ED] tracking-tight">{children}</h1>,
                    h2: ({children}) => <h2 className="text-xl font-bold mb-3 mt-5 text-[#F5F2ED] tracking-tight">{children}</h2>,
                    h3: ({children}) => <h3 className="text-lg font-semibold mb-3 mt-4 text-[#F5F2ED]">{children}</h3>,
                    a: ({children, href}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">{children}</a>,
                    blockquote: ({children}) => <blockquote className="border-l-4 border-[#e07a5f] pl-4 py-1 text-zinc-400 italic my-4 bg-transparent">{children}</blockquote>,
                    table: ({children}) => <div className="overflow-x-auto mb-4 rounded-xl border border-[#3A3A3A] scrollbar-custom"><table className="min-w-full border-collapse text-sm">{children}</table></div>,
                    thead: ({children}) => <thead className="bg-[#2A2A2A] border-b border-[#3A3A3A]">{children}</thead>,
                    th: ({children}) => <th className="px-4 py-3 font-semibold text-left text-zinc-300">{children}</th>,
                    td: ({children}) => <td className="border-t border-[#3A3A3A] px-4 py-3 text-zinc-400">{children}</td>,
                  }}
                >
                  {content}
                </ReactMarkdown>
              ) : (
                content
              )}
              {isStreaming && <span className="ml-1 inline-block w-2.5 h-4 bg-zinc-400 animate-pulse align-middle rounded-sm" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
