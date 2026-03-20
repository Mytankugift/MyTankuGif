'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'

type AuthPersistApi = {
  hasHydrated: () => boolean
  onFinishHydration: (fn: () => void) => () => void
}

function getAuthPersist(): AuthPersistApi | undefined {
  const p = (useAuthStore as unknown as { persist?: AuthPersistApi }).persist
  return typeof p?.hasHydrated === 'function' && typeof p?.onFinishHydration === 'function'
    ? p
    : undefined
}

/**
 * Bloquea /events hasta hidratar auth; opcionalmente valida token con el API.
 * Sin sesión → /auth/login?redirect=/events
 */
export function EventsAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const [hydrated, setHydrated] = useState(false)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    const persist = getAuthPersist()
    if (!persist) {
      queueMicrotask(() => setHydrated(true))
      return
    }
    if (persist.hasHydrated()) {
      setHydrated(true)
    }
    return persist.onFinishHydration(() => {
      setHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    ;(async () => {
      const { token, isAuthenticated: auth } = useAuthStore.getState()
      if (token && !auth) {
        await checkAuth()
      }
      if (!cancelled) setResolved(true)
    })()
    return () => {
      cancelled = true
    }
  }, [hydrated, checkAuth])

  useEffect(() => {
    if (!resolved) return
    if (!isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent('/events')}`)
    }
  }, [resolved, isAuthenticated, router])

  if (!resolved) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center text-sm"
        style={{ color: '#B7B7B7', fontFamily: 'Poppins, sans-serif' }}
      >
        Cargando…
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
