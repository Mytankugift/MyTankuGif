'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
 * Mientras el login por correo no está listo: tras hidratar auth, redirige directo a Google OAuth.
 */
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)
  const redirected = useRef(false)

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
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/feed'
      router.replace(redirect)
      return
    }
    if (redirected.current) return
    redirected.current = true
    const redirect = searchParams.get('redirect') || '/feed'
    window.location.replace(getGoogleOAuthUrl(redirect))
  }, [hydrated, isAuthenticated, router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2D3A3A]">
      <p className="text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
        Conectando con Google…
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#2D3A3A]">
          <p className="text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Cargando…
          </p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
