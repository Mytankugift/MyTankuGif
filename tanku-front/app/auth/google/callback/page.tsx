'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setToken, checkAuth } = useAuthStore()

  useEffect(() => {
    // Obtener todos los parámetros de la URL
    const token = searchParams.get('token')
    const userId = searchParams.get('userId')
    const error = searchParams.get('error')
    
    // Obtener todos los parámetros para debug
    const allParams = Array.from(searchParams.entries()).reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    console.log('🔍 [GOOGLE CALLBACK] Callback recibido:', {
      hasToken: !!token,
      hasUserId: !!userId,
      hasError: !!error,
      tokenLength: token?.length,
      userId,
      error,
      allParams,
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'SSR',
    })

    if (error) {
      console.error('❌ [GOOGLE CALLBACK] Error en autenticación de Google:', error)
      console.error('   URL completa:', typeof window !== 'undefined' ? window.location.href : 'SSR')
      // Redirigir al feed sin mostrar el error en la URL (ya se loggeó)
      router.push('/feed')
      return
    }

    if (token) {
      console.log('✅ [GOOGLE CALLBACK] Token recibido, estableciendo token...')
      console.log('   Token length:', token.length)
      console.log('   Token preview:', token.substring(0, 20) + '...')
      
      try {
        setToken(token)
        console.log('✅ [GOOGLE CALLBACK] Token establecido, verificando autenticación...')
        
        // Verificar autenticación después de establecer el token
        checkAuth()
          .then(() => {
            console.log('✅ [GOOGLE CALLBACK] Autenticación verificada, redirigiendo...')
            
            // Verificar si hay una redirección guardada (ej: /checkout)
            if (typeof window !== 'undefined') {
              const redirect = sessionStorage.getItem('redirect-after-login')
              if (redirect) {
                console.log(`🔄 [GOOGLE CALLBACK] Redirigiendo a ${redirect} después del login...`)
                sessionStorage.removeItem('redirect-after-login')
                router.push(redirect)
                return
              }
            }
            
            router.push('/feed')
          })
          .catch((err) => {
            console.error('❌ [GOOGLE CALLBACK] Error verificando autenticación:', err)
            console.error('   Error details:', err instanceof Error ? err.message : err)
            // Aún así redirigir, el usuario puede estar autenticado
            router.push('/feed')
          })
      } catch (setTokenError) {
        console.error('❌ [GOOGLE CALLBACK] Error estableciendo token:', setTokenError)
        router.push('/feed?error=token_set_failed')
      }
    } else {
      console.error('❌ [GOOGLE CALLBACK] No se recibió token en la URL')
      console.error('   Parámetros recibidos:', { token, userId, error, allParams })
      console.error('   URL completa:', typeof window !== 'undefined' ? window.location.href : 'SSR')
      console.error('   Search params string:', typeof window !== 'undefined' ? window.location.search : 'SSR')
      // Redirigir al feed sin mostrar el error en la URL
      router.push('/feed')
    }
  }, [searchParams, router, setToken, checkAuth])

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
