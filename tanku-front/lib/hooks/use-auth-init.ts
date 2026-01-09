'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

/**
 * Hook para inicializar la autenticación una sola vez al cargar la app
 * Evita verificaciones innecesarias que causan re-renders
 */
export function useAuthInit() {
  const { checkAuth, token, isAuthenticated } = useAuthStore()
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Solo verificar una vez al montar si hay token pero no está autenticado
    if (!hasInitialized.current && token && !isAuthenticated) {
      hasInitialized.current = true
      checkAuth().catch(() => {
        // Silenciar errores en la inicialización
      })
    } else {
      hasInitialized.current = true
    }
  }, []) // Solo ejecutar una vez al montar

  return { isAuthenticated }
}

