/**
 * Hook para gestionar stories
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

export type StoryDTO = {
  id: string
  userId: string
  title: string
  description: string | null
  duration: number
  viewsCount: number
  expiresAt: string
  createdAt: string
  files: Array<{
    id: string
    fileUrl: string
    fileType: string
    fileSize: number | null
    duration: number | null
    orderIndex: number
  }>
  author: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    avatar: string | null
    username: string | null
  }
  storyType?: 'NORMAL' | 'WISHLIST'
  wishlistId?: string | null
  productId?: string | null
  variantId?: string | null
  productHandle?: string | null
}

interface UseStoriesResult {
  // Estado
  feedStories: StoryDTO[]
  wishlistStories: StoryDTO[]
  isLoading: boolean
  error: string | null

  // Acciones
  fetchFeedStories: () => Promise<void>
  fetchWishlistStories: (userId?: string) => Promise<void>
  markStoryAsViewed: (storyId: string) => Promise<void>
  refreshStories: () => Promise<void>
}

export function useStories(): UseStoriesResult {
  const { isAuthenticated, user } = useAuthStore()
  const [feedStories, setFeedStories] = useState<StoryDTO[]>([])
  const [wishlistStories, setWishlistStories] = useState<StoryDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Obtener feed de stories (amigos + propias)
   */
  const fetchFeedStories = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setFeedStories([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<StoryDTO[]>(API_ENDPOINTS.STORIES.FEED)
      if (response.success && response.data) {
        setFeedStories(response.data)
      } else {
        setError(response.error?.message || 'Error al obtener stories')
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener stories')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  /**
   * Obtener historias de wishlist
   */
  const fetchWishlistStories = useCallback(
    async (userId?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const url = userId
          ? `${API_ENDPOINTS.STORIES.WISHLIST}?userId=${userId}`
          : API_ENDPOINTS.STORIES.WISHLIST

        const response = await apiClient.get<StoryDTO[]>(url)
        if (response.success && response.data) {
          setWishlistStories(response.data)
        } else {
          setError(response.error?.message || 'Error al obtener historias de wishlist')
        }
      } catch (err: any) {
        setError(err.message || 'Error al obtener historias de wishlist')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Marcar historia como vista (por ahora solo actualiza localmente)
   */
  const markStoryAsViewed = useCallback(async (storyId: string) => {
    // Por ahora solo actualizamos localmente
    // En el futuro se puede agregar un endpoint para marcar como vista
    setFeedStories((prev) =>
      prev.map((story) =>
        story.id === storyId
          ? { ...story, viewsCount: story.viewsCount + 1 }
          : story
      )
    )
    setWishlistStories((prev) =>
      prev.map((story) =>
        story.id === storyId
          ? { ...story, viewsCount: story.viewsCount + 1 }
          : story
      )
    )
  }, [])

  /**
   * Refrescar todas las stories
   */
  const refreshStories = useCallback(async () => {
    await Promise.all([fetchFeedStories(), fetchWishlistStories()])
  }, [fetchFeedStories, fetchWishlistStories])

  // Cargar feed de stories al montar si está autenticado
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchFeedStories()
    }
  }, [isAuthenticated, user?.id, fetchFeedStories])

  return {
    feedStories,
    wishlistStories,
    isLoading,
    error,
    fetchFeedStories,
    fetchWishlistStories,
    markStoryAsViewed,
    refreshStories,
  }
}

