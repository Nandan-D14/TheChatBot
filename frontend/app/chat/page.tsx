'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { hasValidAccessKey } from '@/lib/userIdentity'

export default function ChatPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    if (!hasValidAccessKey()) {
      router.replace('/login')
    }
    
    // Auto-close sidebar on mobile by default
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }, [router])

  return (
    <div className="flex h-[100dvh] bg-[#0a0a0a] text-zinc-100 overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 flex-shrink-0
          transform transition-all duration-300 ease-in-out
          md:relative
          ${isSidebarOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:-ml-72'}
        `}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative w-full min-w-0">
        <ChatWindow isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      </div>
    </div>
  )
}
