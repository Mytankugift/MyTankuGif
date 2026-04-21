'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { getGoogleOAuthUrl } from '@/lib/auth/google-oauth'

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
 * Sin sesión → OAuth Google con return /events (sin pasar por /auth/login).
 */
export function EventsAuthGate({ children }: { children: React.ReactNode }) {
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
      window.location.replace(getGoogleOAuthUrl('/events'))
    }
  }, [resolved, isAuthenticated])

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
