/**
 * Hook para gestionar stories
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useFeedInitContext } from '@/lib/context/feed-init-context'
import { logger } from '@/lib/utils/logger'

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
  fetchFeedStories: (force?: boolean) => Promise<void>
  fetchWishlistStories: (userId?: string) => Promise<void>
  markStoryAsViewed: (storyId: string) => Promise<void>
  refreshStories: () => Promise<void>
  deleteStoryById: (storyId: string) => Promise<boolean>
}

// ───────────────────────────────────────────────────────────────────────────
// Cache compartido entre instancias de useStories (hay 2 carruseles en el feed)
// + semilla desde feedInit. Evita pedir /stories varias veces por carga.
// ───────────────────────────────────────────────────────────────────────────
const feedStoriesCacheByUser = new Map<string, StoryDTO[]>()
const feedStoriesFetchedAtByUser = new Map<string, number>()
const feedStoriesInflightByUser = new Map<string, Promise<StoryDTO[]>>()
const FEED_STORIES_CACHE_TTL = 60 * 1000 // 1 min

/** Sembrar el cache con lo que ya trajo /feed/init (incluido el caso vacío). */
export function seedFeedStories(userId: string | null | undefined, stories: StoryDTO[]) {
  if (!userId) return
  feedStoriesCacheByUser.set(userId, stories)
  feedStoriesFetchedAtByUser.set(userId, Date.now())
}

async function loadFeedStoriesShared(userId: string, force = false): Promise<StoryDTO[]> {
  if (!force) {
    const cached = feedStoriesCacheByUser.get(userId)
    const fetchedAt = feedStoriesFetchedAtByUser.get(userId) ?? 0
    if (cached && Date.now() - fetchedAt < FEED_STORIES_CACHE_TTL) {
      return cached
    }
    const inflight = feedStoriesInflightByUser.get(userId)
    if (inflight) return inflight
  }

  const promise = (async () => {
    const response = await apiClient.get<StoryDTO[]>(API_ENDPOINTS.STORIES.FEED)
    if (response.success && response.data) {
      feedStoriesCacheByUser.set(userId, response.data)
      feedStoriesFetchedAtByUser.set(userId, Date.now())
      return response.data
    }
    return feedStoriesCacheByUser.get(userId) ?? []
  })().finally(() => {
    feedStoriesInflightByUser.delete(userId)
  })

  feedStoriesInflightByUser.set(userId, promise)
  return promise
}

export function useStories(): UseStoriesResult {
  const { isAuthenticated, user } = useAuthStore()
  const { isComplete, hasData } = useFeedInitContext()
  const [feedStories, setFeedStories] = useState<StoryDTO[]>([])
  const [wishlistStories, setWishlistStories] = useState<StoryDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Obtener feed de stories (amigos + propias)
   */
  const fetchFeedStories = useCallback(async (force = false) => {
    if (!isAuthenticated || !user?.id) {
      setFeedStories([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // ✅ Loader compartido: reutiliza la semilla de feedInit y deduplica las
      // peticiones concurrentes de las 2 instancias del carrusel. force tras mutación.
      const data = await loadFeedStoriesShared(user.id, force)
      setFeedStories(data)
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

  /**
   * Eliminar historia propia (API + estado local del feed)
   */
  const deleteStoryById = useCallback(async (storyId: string) => {
    try {
      const response = await apiClient.delete<void>(API_ENDPOINTS.STORIES.DELETE(storyId))
      if (!response.success) {
        setError(response.error?.message || 'No se pudo eliminar la historia')
        return false
      }
      setFeedStories((prev) => prev.filter((s) => s.id !== storyId))
      setWishlistStories((prev) => prev.filter((s) => s.id !== storyId))
      return true
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la historia')
      return false
    }
  }, [])

  // ✅ Guard para evitar fetch si ya hay datos
  const hasLoadedRef = useRef(false)

  // Cargar feed de stories al montar si está autenticado
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      hasLoadedRef.current = false
      return
    }

    // ✅ Esperar a que feedInit termine antes de hacer fetch
    if (!isComplete) {
      // Si feedInit ya tiene datos de stories, usarlos
      if (hasData.stories && feedStories.length > 0) {
        logger.log('[useStories] feedInit tiene stories, esperando a que termine')
        hasLoadedRef.current = true
      }
      return
    }

    // ✅ feedInit ya completó
    // Si feedInit tiene datos de stories, no hacer fetch
    if (hasData.stories && feedStories.length > 0) {
      logger.log('[useStories] feedInit completó y ya hay stories, omitiendo fetch')
      hasLoadedRef.current = true
      return
    }

    // ✅ feedInit completó pero no tiene stories, hacer fetch
    if (isComplete && !hasData.stories && feedStories.length === 0 && !hasLoadedRef.current) {
      logger.log('[useStories] feedInit completó pero no tiene stories, haciendo fetch')
      hasLoadedRef.current = true
      fetchFeedStories()
    }
  }, [isAuthenticated, user?.id, isComplete, hasData.stories, feedStories.length, fetchFeedStories])

  return {
    feedStories,
    wishlistStories,
    isLoading,
    error,
    fetchFeedStories,
    fetchWishlistStories,
    markStoryAsViewed,
    refreshStories,
    deleteStoryById,
  }
}

