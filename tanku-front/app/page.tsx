'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setToken } = useAuthStore()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      console.error('Error en autenticación:', error)
      router.replace('/feed')
      return
    }

    if (tokenParam) {
      setToken(tokenParam)
      router.replace('/feed')
    } else {
      router.replace('/feed')
    }
  }, [searchParams, router, setToken])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#1E1E1E' }}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
        <p className="text-white">Cargando...</p>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<p className="text-white text-center">Cargando...</p>}>
      <HomeContent />
    </Suspense>
  )
}
