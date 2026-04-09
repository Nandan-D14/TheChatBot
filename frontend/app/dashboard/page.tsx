'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { hasValidAccessKey } from '@/lib/userIdentity'
import { Menu, Activity, Users, MessageSquare, Clock, Zap } from 'lucide-react'
import { getAnalytics, AnalyticsData } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [timeRange, setTimeRange] = useState("All time")
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!hasValidAccessKey()) {
      router.replace('/login')
    }
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }, [router])

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getAnalytics(timeRange).then(data => {
      if (mounted) {
        setAnalytics(data);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false };
  }, [timeRange])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  const formatCost = (tokens: number) => {
    // Rough estimate: $0.002 per 1k tokens
    return '$' + ((tokens / 1000) * 0.002).toFixed(4);
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString();
  }

  const formatEventName = (eventType: string) => {
    switch (eventType) {
      case 'chat_message': return 'Message generated';
      default: return eventType;
    }
  }

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
            <h1 className="text-xl font-semibold text-zinc-100" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>Dashboard</h1>
          </div>
        </header>

        <div className="max-w-6xl mx-auto w-full p-6 py-8">
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold text-[#E8E2D9] tracking-tight mb-2" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>Analytics Overview</h2>
              <p className="text-zinc-400 text-[15px]">Monitor your usage, activity, and token consumption.</p>
            </div>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-[#18181B] border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-zinc-600"
            >
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>This month</option>
              <option>All time</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Messages', value: analytics ? formatNumber(analytics.totalMessages) : '-', desc: 'in selected period', icon: <MessageSquare size={20} className="text-blue-400" /> },
              { label: 'Tokens Used', value: analytics ? formatNumber(analytics.tokensUsed) : '-', desc: analytics ? `≈ ${formatCost(analytics.tokensUsed)} estimated` : '-', icon: <Zap size={20} className="text-amber-400" /> },
              { label: 'Avg. Response Time', value: analytics && analytics.avgLatency ? (analytics.avgLatency / 1000).toFixed(2) + 's' : '-', desc: 'per message generated', icon: <Clock size={20} className="text-emerald-400" /> },
              { label: 'Active Sessions', value: analytics ? analytics.activeSessions.toString() : '-', desc: 'with messages sent', icon: <Users size={20} className="text-purple-400" /> },
            ].map((stat, i) => (
              <div key={i} className="bg-[#18181B] border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-zinc-400">{stat.label}</span>
                  <div className="p-2 bg-zinc-800/50 rounded-lg">{stat.icon}</div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-zinc-100 tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
                    {isLoading ? <div className="h-9 w-16 bg-zinc-800 animate-pulse rounded"></div> : stat.value}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-2">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 bg-[#18181B] border border-zinc-800/60 rounded-2xl p-6 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden group">
              <Activity className="text-zinc-800 w-32 h-32 absolute opacity-10 -right-4 -bottom-4 group-hover:scale-110 transition-transform duration-700" />
              <h3 className="text-lg font-semibold text-zinc-200 mb-2 self-start absolute top-6 left-6">Usage Over Time</h3>
              <p className="text-zinc-500 text-sm">Visualizations require more historical data.</p>
            </div>
            
            <div className="col-span-1 bg-[#18181B] border border-zinc-800/60 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-zinc-200 mb-6">Recent Activity</h3>
              <div className="space-y-6">
                {isLoading ? (
                  <div className="space-y-6">
                    {[1,2,3].map(i => (
                       <div key={i} className="flex gap-4">
                         <div className="w-2 h-2 mt-2 rounded-full bg-zinc-800 flex-shrink-0" />
                         <div className="space-y-2 flex-1">
                           <div className="h-4 bg-zinc-800 animate-pulse rounded w-3/4"></div>
                           <div className="h-3 bg-zinc-800/50 animate-pulse rounded w-1/2"></div>
                         </div>
                       </div>
                    ))}
                  </div>
                ) : analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                  analytics.recentActivity.map((act, i) => (
                    <div key={i} className="flex gap-4 relative">
                      {i !== analytics.recentActivity.length - 1 && <div className="absolute left-1 top-6 bottom-[-16px] w-[2px] bg-zinc-800"></div>}
                      <div className={`w-2 h-2 mt-2 rounded-full bg-blue-500 ring-4 ring-[#18181B] relative z-10 flex-shrink-0`} />
                      <div>
                        <p className="text-sm font-medium text-zinc-300">{formatEventName(act.event_type)}</p>
                        <p className="text-xs text-zinc-500 mt-1">{formatTime(act.created_at)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-500 text-sm italic">No recent activity found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}