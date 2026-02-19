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
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setAuth: (user: AdminUser, token: string) => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/admin/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error?.message || 'Error al iniciar sesión')
        }

        const data = await response.json()
        
        if (data.success && data.data) {
          set({
            user: data.data.user,
            token: data.data.token,
            isAuthenticated: true,
          })
        } else {
          throw new Error('Error al iniciar sesión')
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
    }
  )
)

