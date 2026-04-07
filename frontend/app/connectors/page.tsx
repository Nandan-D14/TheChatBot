'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { hasValidAccessKey } from '@/lib/userIdentity'
import { Menu, Search, Link as LinkIcon, CheckCircle2 } from 'lucide-react'

// Dummy connector data
const CONNECTORS = [
  { id: 'google-drive', name: 'Google Drive', icon: 'M', description: 'Connect your Google Drive to search through docs, sheets, and slides.', connected: true },
  { id: 'notion', name: 'Notion', icon: 'N', description: 'Sync Notion workspace for internal wiki and notes context.', connected: false },
  { id: 'slack', name: 'Slack', icon: 'S', description: 'Connect Slack channels to query chat history and messages.', connected: false },
  { id: 'github', name: 'GitHub', icon: 'G', description: 'Link repositories for code analysis and PR summarization.', connected: true },
  { id: 'confluence', name: 'Confluence', icon: 'C', description: 'Integrate Atlassian Confluence documentation spaces.', connected: false },
]

export default function ConnectorsPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    if (!hasValidAccessKey()) {
      router.replace('/login')
    }
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
      <div className="flex-1 flex flex-col relative w-full h-full overflow-y-auto scrollbar-custom bg-[#0a0a0a]">
        <header className="sticky top-0 z-20 flex items-center justify-between p-4 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-zinc-800/40">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 transition-colors rounded-lg"
              >
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-xl font-semibold text-zinc-100" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>Data Connectors</h1>
          </div>
        </header>

        <div className="max-w-5xl mx-auto w-full p-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#E8E2D9] tracking-tight mb-2" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>Connect your knowledge base</h2>
            <p className="text-zinc-400 text-[15px]">Integrate your favorite tools so the AI can securely search and reference your private data.</p>
          </div>

          <div className="relative mb-8 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search connectors..." 
              className="w-full bg-[#18181B] border border-zinc-800 rounded-xl py-2.5 pl-11 pr-4 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {CONNECTORS.map((connector) => (
              <div key={connector.id} className="bg-[#18181B] border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700 transition-all group flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-300">
                    {connector.icon}
                  </div>
                  {connector.connected ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={14} /> Connected
                    </span>
                  ) : (
                    <button className="text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5">
                      <LinkIcon size={12} /> Connect
                    </button>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-zinc-200 mb-1.5">{connector.name}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed flex-1">
                  {connector.description}
                </p>
                {connector.connected && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Last synced 2 hours ago</span>
                    <button className="text-xs text-zinc-400 hover:text-zinc-200">Configure</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}