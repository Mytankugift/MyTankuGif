/**
 * Hook para manejar datos de onboarding
 */

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { OnboardingDataDTO, UpdateOnboardingDataDTO } from '@/types/api'

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
   * Verificar si el usuario ha completado el onboarding básico
   * Consideramos completado si tiene birthDate, al menos 1 categoría y 1 actividad
   */
  const checkIsCompleted = useCallback(async (): Promise<boolean> => {
    const data = await getOnboardingData()

    if (!data) {
      return false
    }

    const hasBirthDate = !!data.birthDate
    const hasCategories = (data.categoryIds?.length || 0) > 0
    const hasActivities = (data.activities?.length || 0) > 0

    return hasBirthDate && hasCategories && hasActivities
  }, [getOnboardingData])

  return {
    getOnboardingData,
    updateOnboardingData,
    checkIsCompleted,
    isLoading,
    error,
  }
}

