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
    const redirect = searchParams.get('redirect')

    // Si hay error, redirigir al feed sin mostrar error (ya se maneja en el callback)
    if (error) {
      console.error('⚠️ [HOME] Error en autenticación recibido:', error)
      // Limpiar parámetros de la URL antes de redirigir
      router.replace('/feed')
      return
    }

    // Si hay token en la URL, establecerlo y redirigir (por si acaso no pasó por el callback)
    if (tokenParam) {
      console.log('✅ [HOME] Token encontrado en URL, estableciendo...')
      setToken(tokenParam)
      
      // Si hay una redirección especificada (ej: /checkout), redirigir ahí después del login
      if (redirect) {
        console.log(`🔄 [HOME] Redirigiendo a ${redirect} después del login...`)
        router.replace(redirect)
      } else {
        router.replace('/feed')
      }
    } else {
      // Si no hay token ni error, solo redirigir al feed
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
