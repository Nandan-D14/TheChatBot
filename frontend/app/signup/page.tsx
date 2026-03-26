'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignupPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/chat')
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Redirecting</h1>
        <p className="text-sm text-slate-500">Account signup is disabled. Opening chat...</p>
      </div>
    </main>
  )
}
