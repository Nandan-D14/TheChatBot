'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to chat page or auth page
    // For now, redirect to chat
    router.push('/chat')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">TheChatBot</h1>
        <p className="text-muted-foreground mt-2">Loading...</p>
      </div>
    </div>
  )
}
