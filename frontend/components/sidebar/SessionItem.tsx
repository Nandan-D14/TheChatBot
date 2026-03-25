import { Session } from '@/hooks/useSessions'
import { MessageSquare, Trash2 } from 'lucide-react'

interface SessionItemProps {
  session: Session
  onClick: () => void
  onDelete: () => void
  isDeleting?: boolean
}

export function SessionItem({ session, onClick, onDelete, isDeleting = false }: SessionItemProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const today = new Date()
      
      // If it's today, show time
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      
      // Otherwise show relative date
      const diffTime = Math.abs(today.getTime() - date.getTime())
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
      className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-all hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <MessageSquare size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-[14px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            {session.title || 'New Conversation'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(session.created_at)}</p>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (!isDeleting) onDelete()
        }}
        disabled={isDeleting}
        className={`opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all ml-2 disabled:opacity-100 disabled:cursor-wait ${isDeleting ? 'animate-pulse' : ''}`}
        title={isDeleting ? "Deleting..." : "Delete session"}
      >
        {isDeleting ? (
          <div className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Trash2 size={16} />
        )}
      </button>
    </div>
  )
}
