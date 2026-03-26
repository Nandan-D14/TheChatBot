'use client'

import { MessageSquare } from 'lucide-react'
import { useParams } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'

interface SessionItemProps {
  id: string
  title: string
  createdAt?: string
  onClick: () => void
  onDelete?: () => void
  isDeleting?: boolean
}

export function SessionItem({ id, title, createdAt, onClick, onDelete, isDeleting = false }: SessionItemProps) {
  const params = useParams()
  const isActive = params?.session === id

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div
      className={`w-full group flex flex-col gap-1 p-3 rounded-xl transition-all border ${
        isActive 
          ? 'bg-zinc-800 text-zinc-100 border-zinc-700' 
          : 'hover:bg-zinc-900 border-transparent text-zinc-400 hover:text-zinc-200'
      }`}
    >
      <div className="flex items-start gap-2 w-full">
        <button onClick={onClick} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-3 w-full">
            <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
            <div className="flex-1 w-full text-left overflow-hidden">
              <p className="text-sm font-medium truncate w-full" title={title}>
                {title || 'New Conversation'}
              </p>
              {createdAt && (
                <p className="text-[10px] text-zinc-500 mt-1 truncate">
                  {formatTime(createdAt)}
                </p>
              )}
            </div>
          </div>
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="mt-0.5 p-1.5 rounded-md text-zinc-500 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Delete chat"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}
