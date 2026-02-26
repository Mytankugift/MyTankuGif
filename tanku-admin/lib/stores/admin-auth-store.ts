'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminUser {
  id: string
  email: string
  role: 'SUPER_ADMIN' | 'PRODUCT_MANAGER'
  firstName: string | null
  lastName: string | null
  active: boolean
}

interface AdminAuthState {
  user: AdminUser | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setAuth: (user: AdminUser, token: string) => void
  setHasHydrated: (state: boolean) => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state })
      },

      login: async (email: string, password: string) => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
          const url = `${apiUrl}/api/v1/admin/auth/login`
          
          console.log('[AUTH] Intentando login en:', url)
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          })

          console.log('[AUTH] Response status:', response.status)

          if (!response.ok) {
            let errorMessage = 'Error al iniciar sesión'
            try {
              const error = await response.json()
              console.error('[AUTH] Error response:', error)
              errorMessage = error.error?.message || error.message || errorMessage
            } catch (e) {
              console.error('[AUTH] Error parseando respuesta de error:', e)
              errorMessage = `Error ${response.status}: ${response.statusText}`
            }
            throw new Error(errorMessage)
          }

          const data = await response.json()
          console.log('[AUTH] Response data:', data)
          
          if (data.success && data.data) {
            const { user, token } = data.data
            console.log('[AUTH] Guardando auth:', { user: user?.email, hasToken: !!token })
            
            set({
              user,
              token,
              isAuthenticated: true,
            })
            
            console.log('[AUTH] Auth guardado exitosamente')
          } else {
            console.error('[AUTH] Respuesta inválida:', data)
            throw new Error('Error al iniciar sesión: respuesta inválida')
          }
        } catch (error: any) {
          console.error('[AUTH] Error en login:', error)
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      setAuth: (user: AdminUser, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
        })
      },
    }),
    {
      name: 'admin-auth-storage',
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[AUTH STORE] Error en hidratación:', error)
            // Aún así marcar como hidratado para evitar loops infinitos
            if (state) {
              state.setHasHydrated(true)
            }
            return
          }
          
          console.log('[AUTH STORE] Hidratación completada:', { 
            isAuthenticated: state?.isAuthenticated,
            user: state?.user?.email 
          })
          
          // Establecer el flag de hidratación inmediatamente
          if (state) {
            state.setHasHydrated(true)
          }
        }
      },
    }
  )
)

// En el cliente, establecer hidratación después de un breve delay
// para casos donde onRehydrateStorage no se ejecute
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const state = useAdminAuthStore.getState()
    if (!state._hasHydrated) {
      console.log('[AUTH STORE] Estableciendo hidratación manualmente')
      state.setHasHydrated(true)
    }
  }, 100)
}

// Hook para verificar si el store está hidratado
export const useAuthHydrated = () => {
  return useAdminAuthStore((state) => state._hasHydrated)
}

