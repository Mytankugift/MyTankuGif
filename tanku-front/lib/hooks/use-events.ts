'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

export type RepeatType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface Event {
  id: string
  userId: string
  title: string
  description: string | null
  eventDate: string
  repeatType: RepeatType
  reminders: number[]
  color: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  date: string
  originalEventDate: string
  repeatType: RepeatType
  reminders: number[]
  color: string
  isActive: boolean
}

export interface CreateEventInput {
  title: string
  description?: string
  eventDate: string
  repeatType: RepeatType
  reminders: number[]
  color?: string
}

export interface UpdateEventInput {
  title?: string
  description?: string
  eventDate?: string
  repeatType?: RepeatType
  reminders?: number[]
  isActive?: boolean
  color?: string
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err == null) return fallback
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message
  }
  return fallback
}

export function useEvents() {
  const { isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Crear un nuevo evento
   */
  const createEvent = useCallback(async (data: CreateEventInput): Promise<Event | null> => {
    if (!isAuthenticated) {
      setError('No autenticado')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await apiClient.post<Event>(API_ENDPOINTS.EVENTS.CREATE, data)
      if (res.success && res.data) {
        return res.data
      }
      setError(apiErrorMessage(res.error, 'Error al crear evento'))
      return null
    } catch (err: any) {
      setError(err.message || 'Error al crear evento')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  /**
   * Actualizar un evento
   */
  const updateEvent = useCallback(async (id: string, data: UpdateEventInput): Promise<Event | null> => {
    if (!isAuthenticated) {
      setError('No autenticado')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await apiClient.put<Event>(API_ENDPOINTS.EVENTS.UPDATE(id), data)
      if (res.success && res.data) {
        return res.data
      }
      setError(apiErrorMessage(res.error, 'Error al actualizar evento'))
      return null
    } catch (err: any) {
      setError(err.message || 'Error al actualizar evento')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  /**
   * Eliminar un evento
   */
  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('No autenticado')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await apiClient.delete(API_ENDPOINTS.EVENTS.DELETE(id))
      if (res.success) {
        return true
      }
      setError(apiErrorMessage(res.error, 'Error al eliminar evento'))
      return false
    } catch (err: any) {
      setError(err.message || 'Error al eliminar evento')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  /**
   * Obtener eventos de un mes específico (con repeticiones calculadas)
   */
  const getEventsForMonth = useCallback(async (month: number, year: number): Promise<CalendarEvent[]> => {
    if (!isAuthenticated) {
      setError('No autenticado')
      return []
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = `${API_ENDPOINTS.EVENTS.LIST}?month=${month}&year=${year}`
      const res = await apiClient.get<CalendarEvent[]>(url)
      if (res.success && res.data) {
        return res.data
      }
      setError(apiErrorMessage(res.error, 'Error al obtener eventos'))
      return []
    } catch (err: any) {
      setError(err.message || 'Error al obtener eventos')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  /**
   * Obtener todos los eventos del usuario (sin repeticiones)
   */
  const getUserEvents = useCallback(async (): Promise<Event[]> => {
    if (!isAuthenticated) {
      setError('No autenticado')
      return []
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await apiClient.get<Event[]>(API_ENDPOINTS.EVENTS.LIST)
      if (res.success && res.data) {
        return res.data
      }
      setError(apiErrorMessage(res.error, 'Error al obtener eventos'))
      return []
    } catch (err: any) {
      setError(err.message || 'Error al obtener eventos')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  /**
   * Obtener un evento por ID
   */
  const getEventById = useCallback(async (id: string): Promise<Event | null> => {
    if (!isAuthenticated) {
      setError('No autenticado')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await apiClient.get<Event>(API_ENDPOINTS.EVENTS.BY_ID(id))
      if (res.success && res.data) {
        return res.data
      }
      setError(apiErrorMessage(res.error, 'Error al obtener evento'))
      return null
    } catch (err: any) {
      setError(err.message || 'Error al obtener evento')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForMonth,
    getUserEvents,
    getEventById,
    isLoading,
    error,
  }
}

