'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { FeedItem, FeedResponse, FeedFilters } from '@/lib/types/feed.types'

export function useFeed(filters: FeedFilters = {}) {
  const { token } = useAuthStore()
  const [items, setItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursorToken, setNextCursorToken] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Filtrar items sin imágenes
  const filterItemsWithImages = (items: FeedItem[]): FeedItem[] => {
    return items.filter(item => {
      if (!item.imageUrl || item.imageUrl.trim() === '') {
        return false
      }
      // Verificar que la URL sea válida
      try {
        new URL(item.imageUrl)
        return true
      } catch {
        return false
      }
    })
  }

  // Cargar feed inicial
  const loadFeed = useCallback(async () => {
    setIsLoading(true)
    setItems([])
    setNextCursorToken(null)
    setHasMore(true)
    setError(null)

    try {
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      let url = '/api/v1/feed'
      const params = new URLSearchParams()
      if (filters.categoryId) {
        params.append('categoryId', filters.categoryId)
      }
      if (filters.searchQuery) {
        params.append('search', filters.searchQuery)
      }
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await apiClient.get<FeedResponse>(url, headers)

      if (response.success && response.data) {
        // Log detallado para debugging
        console.log('[FEED] Respuesta inicial:', {
          hasData: !!response.data,
          hasItems: !!response.data.items,
          itemsCount: response.data.items?.length || 0,
          hasNextCursorToken: !!response.data.nextCursorToken,
          nextCursorTokenType: typeof response.data.nextCursorToken,
          nextCursorTokenValue: response.data.nextCursorToken,
        })

        // Filtrar items sin imágenes
        const validItems = filterItemsWithImages(response.data.items || [])
        
        // Asegurar que nextCursorToken sea string | null
        const safeCursor = typeof response.data.nextCursorToken === 'string' 
          ? response.data.nextCursorToken 
          : (response.data.nextCursorToken === null ? null : null)
        
        console.log('[FEED] Cursor procesado:', {
          original: response.data.nextCursorToken,
          safe: safeCursor,
          type: typeof safeCursor,
        })
        
        setItems(validItems)
        setNextCursorToken(safeCursor)
        setHasMore(!!safeCursor)
      } else {
        setError(new Error(response.error?.message || 'Error cargando feed'))
        setHasMore(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'))
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [token, filters.categoryId, filters.searchQuery])

  // Cargar más items usando cursor
  const loadMore = useCallback(async () => {
    if (!nextCursorToken || isLoadingMore || !hasMore) {
      return
    }

    setIsLoadingMore(true)
    setError(null)

    try {
      const headers: HeadersInit = {
        'X-Feed-Cursor': nextCursorToken, // Enviar cursor en header
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      let url = '/api/v1/feed'
      const params = new URLSearchParams()
      if (filters.categoryId) {
        params.append('categoryId', filters.categoryId)
      }
      if (filters.searchQuery) {
        params.append('search', filters.searchQuery)
      }
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await apiClient.get<FeedResponse>(url, headers)

      if (response.success && response.data) {
        // Log detallado para debugging
        console.log('[FEED] Respuesta loadMore:', {
          hasData: !!response.data,
          hasItems: !!response.data.items,
          itemsCount: response.data.items?.length || 0,
          hasNextCursorToken: !!response.data.nextCursorToken,
          nextCursorTokenType: typeof response.data.nextCursorToken,
          nextCursorTokenValue: response.data.nextCursorToken,
        })

        // Filtrar items sin imágenes
        const validItems = filterItemsWithImages(response.data.items || [])
        
        // Asegurar que nextCursorToken sea string | null
        const safeCursor = typeof response.data.nextCursorToken === 'string' 
          ? response.data.nextCursorToken 
          : (response.data.nextCursorToken === null ? null : null)
        
        console.log('[FEED] Cursor procesado (loadMore):', {
          original: response.data.nextCursorToken,
          safe: safeCursor,
          type: typeof safeCursor,
        })
        
        // Preservar posición del scroll antes de actualizar items
        const scrollContainer = document.querySelector('.custom-scrollbar') as HTMLElement
        const scrollTop = scrollContainer?.scrollTop || 0
        
        setItems((prev) => [...prev, ...validItems])
        setNextCursorToken(safeCursor)
        setHasMore(!!safeCursor)
        
        // Restaurar posición del scroll después de que React actualice el DOM
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollTop
            }
          })
        })
      } else {
        setError(new Error(response.error?.message || 'Error cargando más'))
        setHasMore(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'))
      setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [nextCursorToken, isLoadingMore, hasMore, token, filters.categoryId, filters.searchQuery])

  // Cargar feed cuando cambian los filtros
  const categoryId = filters.categoryId ?? null
  const searchQuery = filters.searchQuery ?? ''
  
  useEffect(() => {
    loadFeed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, categoryId, searchQuery])

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    nextCursorToken,
    error,
    loadMore,
    reload: loadFeed,
  }
}

