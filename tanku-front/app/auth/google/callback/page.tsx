'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setToken } = useAuthStore()

  useEffect(() => {
    const token = searchParams.get('token')
    const userId = searchParams.get('userId')
    const error = searchParams.get('error')

    if (error) {
      console.error('Error en autenticación de Google:', error)
      router.push('/?error=' + encodeURIComponent(error))
      return
    }

    if (token) {
      setToken(token)
      router.push('/')
    } else {
      router.push('/?error=missing_token')
    }
  }, [searchParams, router, setToken])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
        <p className="text-white">Completando autenticación...</p>
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<p className="text-white text-center">Autenticando...</p>}>
      <GoogleCallbackContent />
    </Suspense>
  )
}
