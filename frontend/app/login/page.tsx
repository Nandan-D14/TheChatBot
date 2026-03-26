'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { hasValidAccessKey, isAccessKeyValid, setAccessKeyForOneHour } from '@/lib/userIdentity'

export default function LoginPage() {
  const router = useRouter()
  const [accessKey, setAccessKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (hasValidAccessKey()) {
      router.replace('/chat')
    }
  }, [router])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!isAccessKeyValid(accessKey)) {
      setError('Invalid access key. Please try again.')
      return
    }

    setAccessKeyForOneHour(accessKey.trim())
    router.replace('/chat')
  }

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Welcome Back</h1>
          <p className="text-sm text-zinc-500">Sign in to continue to your chat</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="Enter access key"
              className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm"
              autoComplete="off"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-3 rounded-xl bg-zinc-100 text-zinc-900 font-medium text-sm transition-colors hover:bg-white active:scale-[0.98]"
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  )
}
