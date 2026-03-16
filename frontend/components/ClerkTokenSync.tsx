'use client'

import { useAuth, useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'
import { setGetTokenFn } from '@/lib/auth'

export function ClerkTokenSync() {
  const { getToken, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isSignedIn) {
      setGetTokenFn(null)
      return
    }
    setGetTokenFn(getToken)
    return () => setGetTokenFn(null)
  }, [isSignedIn, getToken])

  return null
}
