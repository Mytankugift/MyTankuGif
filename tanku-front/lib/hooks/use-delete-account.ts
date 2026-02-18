/**
 * Hook para eliminar cuenta de usuario
 */

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useRouter } from 'next/navigation'

export function useDeleteAccount() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { logout } = useAuthStore()
  const router = useRouter()

  /**
   * Eliminar cuenta de usuario
   */
  const deleteAccount = useCallback(async (): Promise<void> => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await apiClient.delete<{ message: string }>(
        API_ENDPOINTS.USERS.DELETE_ACCOUNT
      )

      if (response.success) {
        // Cerrar sesión y redirigir al home
        logout()
        router.push('/')
      } else {
        throw new Error('Error al eliminar la cuenta')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al eliminar la cuenta')
      setError(error)
      throw error
    } finally {
      setIsDeleting(false)
    }
  }, [logout, router])

  return {
    deleteAccount,
    isDeleting,
    error,
  }
}

