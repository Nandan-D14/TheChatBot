'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { hasValidAccessKey } from '@/lib/userIdentity'
import { Menu, Key, User, Palette, Shield, LogOut, Paintbrush, Bell } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    if (!hasValidAccessKey()) {
      router.replace('/login')
    }
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }, [router])

  const TABS = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'security', label: 'Security & API Keys', icon: <Shield size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ]

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
            <h1 className="text-xl font-semibold text-zinc-100" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>Settings</h1>
          </div>
        </header>

        <div className="max-w-4xl mx-auto w-full p-6 py-8 flex flex-col md:flex-row gap-8">
          {/* Settings Sidebar */}
          <div className="w-full md:w-64 flex flex-col gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  activeTab === tab.id 
                  ? 'bg-zinc-800/80 text-zinc-100 border border-zinc-700/50' 
                  : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            
            <div className="mt-8 pt-6 border-t border-zinc-800/60">
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to log out?")) {
                    localStorage.removeItem('userAccessKey')
                    router.push('/login')
                  }
                }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors text-sm font-medium w-full"
              >
                <LogOut size={18} />
                Log out
              </button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 bg-[#18181B] border border-zinc-800/60 rounded-3xl p-8 min-h-[500px]">
            {activeTab === 'profile' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="text-2xl font-semibold text-zinc-100 mb-6" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>Profile Information</h2>
                <div className="space-y-6 max-w-lg">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-20 w-20 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl font-bold text-zinc-300">
                      N
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition-colors">
                        Change Avatar
                      </button>
                      <button className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors ml-2">
                        Remove
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Display Name</label>
                    <input type="text" defaultValue="Nandan" className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email Address</label>
                    <input type="email" defaultValue="nandan@example.com" className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all font-medium" />
                  </div>
                  <div className="pt-4">
                    <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="text-2xl font-semibold text-zinc-100 mb-6" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>Appearance</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400 mb-3">Theme Preference</h3>
                    <div className="flex gap-4">
                      <button className="flex flex-col items-center gap-2">
                        <div className="h-20 w-32 rounded-xl bg-[#0a0a0a] border-2 border-blue-500 flex items-center justify-center p-2">
                          <div className="w-full h-full bg-[#18181B] rounded-lg border border-zinc-800"></div>
                        </div>
                        <span className="text-sm text-zinc-200">Dark mode</span>
                      </button>
                      <button className="flex flex-col items-center gap-2 opacity-50 cursor-not-allowed" title="Coming soon">
                        <div className="h-20 w-32 rounded-xl bg-[#f4f4f5] border-2 border-zinc-800 flex items-center justify-center p-2">
                          <div className="w-full h-full bg-white rounded-lg border border-zinc-300"></div>
                        </div>
                        <span className="text-sm text-zinc-400">Light mode</span>
                      </button>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-zinc-800/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-zinc-200">Compact Interface</h3>
                        <p className="text-xs text-zinc-500 mt-1">Reduce spacing between messages and UI elements.</p>
                      </div>
                      <div className="w-11 h-6 bg-zinc-700 rounded-full relative cursor-pointer opacity-50">
                        <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="text-2xl font-semibold text-zinc-100 mb-6" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>Security & API Keys</h2>
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-zinc-300">OpenAI API Key</h3>
                      <span className="text-xs text-emerald-400 font-medium bg-emerald-400/10 px-2.5 py-0.5 rounded-full">Connected</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                        <input type="password" value="sk-••••••••••••••••••••••••••••••••" readOnly className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-4 py-2.5 pl-10 text-zinc-400 font-mono text-sm focus:outline-none" />
                      </div>
                      <button className="px-4 py-2 text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors">Edit</button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">Required for custom models bypassing our infrastructure.</p>
                  </div>
                  
                  <div className="pt-6 border-t border-zinc-800/60">
                    <h3 className="text-sm font-medium text-zinc-300 mb-4">Anthropic API Key</h3>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                        <input type="text" placeholder="sk-ant-..." className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-4 py-2.5 pl-10 text-zinc-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all" />
                      </div>
                      <button className="px-4 py-2 text-zinc-900 bg-zinc-200 hover:bg-white rounded-xl text-sm font-medium transition-colors">Add Key</button>
                    </div>
                  </div>

                  <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl mt-8">
                    <h3 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h3>
                    <p className="text-xs text-red-400/70 mb-3">Irreversible actions relative to your account.</p>
                    <button className="px-4 py-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors">Delete Account</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="text-2xl font-semibold text-zinc-100 mb-6" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>Notifications</h2>
                <div className="space-y-6">
                  {[
                    { title: 'New Features', desc: 'Get notified about new AI models and features.' },
                    { title: 'Security Alerts', desc: 'Important notifications about your account security.' },
                    { title: 'Email Summaries', desc: 'Weekly analytics and usage summaries.' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between pb-6 last:pb-0 last:border-0 border-b border-zinc-800/60">
                      <div>
                        <h3 className="text-sm font-medium text-zinc-200">{item.title}</h3>
                        <p className="text-xs text-zinc-500 mt-1">{item.desc}</p>
                      </div>
                      <div className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${i === 1 ? 'bg-blue-600' : 'bg-zinc-700 opacity-50'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${i === 1 ? 'left-[22px]' : 'left-0.5'}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}