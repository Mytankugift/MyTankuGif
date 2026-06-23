/**
 * Hook para manejar datos de onboarding
 */

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { clearCategoriesCache } from '@/lib/hooks/use-categories'
import type { OnboardingDataDTO, UpdateOnboardingDataDTO } from '@/types/api'

function isOnboardingFetchUnavailable(err: unknown): boolean {
  const errorMessage = err instanceof Error ? err.message : String(err)
  return (
    errorMessage.includes('No se pudo conectar al servidor') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('NETWORK_ERROR_SILENT') ||
    errorMessage.startsWith('Timeout:')
  )
}

function isOnboardingCompleted(data: OnboardingDataDTO): boolean {
  const hasBirthDate = !!data.birthDate
  const hasCategories = (data.categoryIds?.length || 0) > 0
  const hasActivities = (data.activities?.length || 0) > 0
  return hasBirthDate && hasCategories && hasActivities
}

export function useOnboarding() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Obtener datos de onboarding del usuario
   */
  const getOnboardingData = useCallback(async (): Promise<OnboardingDataDTO | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<OnboardingDataDTO>(
        API_ENDPOINTS.USERS.ONBOARDING_DATA.GET
      )

      if (response.success && response.data) {
        return response.data
      }

      return null
    } catch (err) {
      // Silenciar errores de conexión cuando el backend no está disponible
      if (isOnboardingFetchUnavailable(err)) {
        return null
      }
      
      // Para otros errores, guardarlos pero no lanzarlos
      const error = err instanceof Error ? err : new Error('Error al obtener datos de onboarding')
      setError(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Actualizar datos de onboarding
   */
  const updateOnboardingData = useCallback(
    async (data: UpdateOnboardingDataDTO): Promise<OnboardingDataDTO | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.put<OnboardingDataDTO>(
          API_ENDPOINTS.USERS.ONBOARDING_DATA.UPDATE,
          data
        )

        if (response.success && response.data) {
          if (Object.prototype.hasOwnProperty.call(data, 'birthDate')) {
            clearCategoriesCache()
          }
          return response.data
        }

        throw new Error(response.error?.message || 'Error al actualizar datos de onboarding')
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Error al actualizar datos de onboarding')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Verificar si el usuario ha completado el onboarding básico.
   * - true: completado
   * - false: la API respondió y falta información
   * - null: no se pudo verificar (p. ej. backend caído); no inferir incompleto
   */
  const checkIsCompleted = useCallback(async (): Promise<boolean | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<OnboardingDataDTO>(
        API_ENDPOINTS.USERS.ONBOARDING_DATA.GET
      )

      if (response.success && response.data) {
        return isOnboardingCompleted(response.data)
      }

      return false
    } catch (err) {
      if (isOnboardingFetchUnavailable(err)) {
        return null
      }

      const error = err instanceof Error ? err : new Error('Error al verificar onboarding')
      setError(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    getOnboardingData,
    updateOnboardingData,
    checkIsCompleted,
    isLoading,
    error,
  }
}

