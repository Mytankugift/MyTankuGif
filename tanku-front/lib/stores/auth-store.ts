/**
 * Store de autenticación (Zustand)
 * Maneja el estado de autenticación del usuario
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { User } from '@/types/api'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  refreshToken: () => Promise<void>
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await apiClient.post<{ user: User; accessToken: string; refreshToken: string }>(
            API_ENDPOINTS.AUTH.LOGIN,
            { email, password }
          )
          
          if (response.success && response.data) {
            apiClient.setToken(response.data.accessToken)
            set({
              user: response.data.user,
              token: response.data.accessToken,
              isLoading: false,
              isAuthenticated: true,
            })
            
            // Emitir evento para que el cart store recargue el carrito y asocie el carrito guest
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('userAuthenticated'))
            }
          } else {
            set({ isLoading: false })
            throw new Error(response.error?.message || 'Error al iniciar sesión')
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const response = await apiClient.post<{ user: User; accessToken: string; refreshToken: string }>(
            API_ENDPOINTS.AUTH.REGISTER,
            data
          )
          
          if (response.success && response.data) {
            apiClient.setToken(response.data.accessToken)
            set({
              user: response.data.user,
              token: response.data.accessToken,
              isLoading: false,
              isAuthenticated: true,
            })
            
            // El carrito guest se asociará automáticamente cuando se obtenga el carrito del usuario
            // El backend en getUserCart ya maneja esto buscando carritos guest y asociándolos
          } else {
            set({ isLoading: false })
            throw new Error(response.error?.message || 'Error al registrarse')
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        apiClient.setToken(null)
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        })
      },

      checkAuth: async () => {
        const token = get().token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
        if (!token) {
          set({ isAuthenticated: false })
          return
        }

        apiClient.setToken(token)
        try {
          const response = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME)
          
          if (response.success && response.data) {
            const wasNotAuthenticated = !get().isAuthenticated
            set({ 
              user: response.data, 
              token,
              isAuthenticated: true 
            })
            
            // Si el usuario no estaba autenticado antes, recargar el carrito para asociar carrito guest
            if (wasNotAuthenticated && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('userAuthenticated'))
            }
          } else {
            set({ 
              user: null, 
              token: null, 
              isAuthenticated: false 
            })
          }
        } catch (error) {
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false 
          })
        }
      },

      refreshToken: async () => {
        // Implementar refresh token cuando sea necesario
        const refreshToken = typeof window !== 'undefined' 
          ? localStorage.getItem('refresh-token') 
          : null
        
        if (!refreshToken) {
          get().logout()
          return
        }

        try {
          const response = await apiClient.post<{ accessToken: string; refreshToken: string }>(
            API_ENDPOINTS.AUTH.REFRESH,
            { refreshToken }
          )
          
          if (response.success && response.data) {
            apiClient.setToken(response.data.accessToken)
            if (typeof window !== 'undefined') {
              localStorage.setItem('refresh-token', response.data.refreshToken)
            }
            set({ token: response.data.accessToken })
          } else {
            get().logout()
          }
        } catch (error) {
          get().logout()
        }
      },

      setToken: (token: string | null) => {
        apiClient.setToken(token)
        if (token) {
          set({ token, isAuthenticated: true })
          // Verificar autenticación de forma asíncrona sin bloquear
          get().checkAuth().catch(() => {
            // Si falla, mantener el token pero marcar como no autenticado
            set({ isAuthenticated: false })
          })
        } else {
          set({ token: null, isAuthenticated: false, user: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Sincronizar token con apiClient cuando se hidrata desde localStorage
        if (state?.token) {
          apiClient.setToken(state.token)
        }
      },
    }
  )
)

