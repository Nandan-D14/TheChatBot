'use client'

import { useEffect, useState } from 'react'
import { client } from '@/lib/appwrite'

export default function AppwritePing() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    // Ping Appwrite backend to verify setup
    client.ping()
      .then(() => {
        console.log('✓ Appwrite backend connection verified')
      })
      .catch((error: Error) => {
        console.error('✗ Appwrite backend connection failed:', error)
      })
  }, [])

  // Only render on client side to avoid hydration mismatch
  if (!isMounted) {
    return null
  }

  return null
}
