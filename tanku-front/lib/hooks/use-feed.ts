'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useFeedInitContext } from '@/lib/context/feed-init-context'
import type { FeedItem, FeedResponse, FeedFilters } from '@/lib/types/feed.types'

export function useFeed(filters: FeedFilters = {}, options?: { skipInitialLoad?: boolean }) {
  const { token, isAuthenticated } = useAuthStore()
  const { isComplete, hasData } = useFeedInitContext()
  const [items, setItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(!options?.skipInitialLoad) // ✅ No cargar si skipInitialLoad
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursorToken, setNextCursorToken] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const hasLoadedRef = useRef(false) // ✅ Guard para evitar múltiples cargas

  // ✅ REMOVIDO: Ya no filtramos items sin imágenes
  // El backend ahora permite productos sin imágenes (se mostrarán con placeholder)
  // const filterItemsWithImages = (items: FeedItem[]): FeedItem[] => {
  //   return items.filter(item => {
  //     if (!item.imageUrl || item.imageUrl.trim() === '') {
  //       return false
  //     }
  //     // Verificar que la URL sea válida
  //     try {
  //       new URL(item.imageUrl)
  //       return true
  //     } catch {
  //       return false
  //     }
  //   })
  // }

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

      // Usar endpoint público si no está autenticado, endpoint privado si está autenticado
      let url = isAuthenticated ? '/api/v1/feed' : '/api/v1/feed/public'
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

        // ✅ REMOVIDO: Ya no filtramos items sin imágenes, el frontend manejará el placeholder
        let validItems = response.data.items || []
        let safeCursor = typeof response.data.nextCursorToken === 'string' 
          ? response.data.nextCursorToken 
          : (response.data.nextCursorToken === null ? null : null)
        
        // ✅ Si no está autenticado, cargar más páginas automáticamente para tener al menos 100 productos
        if (!isAuthenticated && safeCursor && validItems.length > 0) {
          let currentCursor: string | null = safeCursor
          let attempts = 0
          const maxAttempts = 3 // Cargar hasta 3 páginas más (50 + 50 + 50 = 150 productos)
          
          while (currentCursor && attempts < maxAttempts && validItems.length < 100) {
            try {
              const moreHeaders: HeadersInit = {
                'X-Feed-Cursor': currentCursor, // currentCursor ya está verificado en el while
              }
              
              // Mantener los mismos filtros si existen
              let moreUrl = '/api/v1/feed/public'
              const params = new URLSearchParams()
              if (filters.categoryId) {
                params.append('categoryId', filters.categoryId)
              }
              if (filters.searchQuery) {
                params.append('search', filters.searchQuery)
              }
              if (params.toString()) {
                moreUrl += `?${params.toString()}`
              }
              
              const moreResponse: Awaited<ReturnType<typeof apiClient.get<FeedResponse>>> = await apiClient.get<FeedResponse>(moreUrl, moreHeaders)
              
              if (moreResponse.success && moreResponse.data) {
                const moreItems = moreResponse.data.items || []
                if (moreItems.length > 0) {
                  // Combinar items de la nueva página
                  validItems = [...validItems, ...moreItems]
                  // Actualizar cursor con el de la nueva página
                  currentCursor = typeof moreResponse.data.nextCursorToken === 'string' 
                    ? moreResponse.data.nextCursorToken 
                    : null
                  attempts++
                  
                  console.log(`[FEED] Página ${attempts + 1} cargada:`, {
                    itemsCount: moreItems.length,
                    totalItems: validItems.length,
                    hasNextCursorToken: !!currentCursor,
                  })
                } else {
                  break // No hay más items, salir del loop
                }
              } else {
                break // Error en la respuesta, salir del loop
              }
            } catch (err) {
              console.error(`[FEED] Error cargando página ${attempts + 2}:`, err)
              break // Salir del loop si hay error
            }
          }
          
          // Actualizar el cursor final
          safeCursor = currentCursor
        }
        
        console.log('[FEED] Cursor procesado:', {
          original: response.data.nextCursorToken,
          safe: safeCursor,
          type: typeof safeCursor,
          totalItems: validItems.length,
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
  }, [token, isAuthenticated, filters.categoryId, filters.searchQuery])

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

      // Usar endpoint público si no está autenticado, endpoint privado si está autenticado
      let url = isAuthenticated ? '/api/v1/feed' : '/api/v1/feed/public'
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

        // ✅ REMOVIDO: Ya no filtramos items sin imágenes, el frontend manejará el placeholder
        const validItems = response.data.items || []
        
        // Si no hay items nuevos, no actualizar nada
        if (validItems.length === 0) {
          console.log('[FEED] No hay items nuevos en loadMore')
          setHasMore(false)
          setIsLoadingMore(false)
          return
        }
        
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
        
        // Filtrar duplicados: solo agregar items que no estén ya en la lista
        setItems((prev) => {
          const existingIds = new Set(prev.map(item => item.id))
          const newItems = validItems.filter(item => !existingIds.has(item.id))
          
          if (newItems.length === 0) {
            console.log('[FEED] Todos los items ya están cargados, no se agregan duplicados')
            return prev
          }
          
          console.log('[FEED] Agregando', newItems.length, 'items nuevos de', validItems.length, 'recibidos')
          return [...prev, ...newItems]
        })
        
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
  }, [nextCursorToken, isLoadingMore, hasMore, token, isAuthenticated, filters.categoryId, filters.searchQuery])

  // Cargar feed cuando cambian los filtros (solo si no se salta la carga inicial)
  const categoryId = filters.categoryId ?? null
  const searchQuery = filters.searchQuery ?? ''
  const previousCategoryRef = useRef<string | null>(null)
  const previousSearchRef = useRef<string>('')
  
  useEffect(() => {
    // Detectar cambio de categoría o búsqueda
    const categoryChanged = previousCategoryRef.current !== categoryId
    const searchChanged = previousSearchRef.current !== searchQuery
    const filtersChanged = categoryChanged || searchChanged
    
    // Actualizar referencias
    previousCategoryRef.current = categoryId
    previousSearchRef.current = searchQuery
    
    // Si hay un cambio de filtros, resetear el guard y cargar
    if (filtersChanged) {
      hasLoadedRef.current = false
      // Si hay filtros o cambió a "Todas", cargar inmediatamente
      if (categoryId || searchQuery || (!categoryId && !searchQuery)) {
        hasLoadedRef.current = true
        loadFeed()
        return
      }
    }
    
    // Si skipInitialLoad está activo, no cargar aquí (se usa feedInit)
    if (options?.skipInitialLoad) {
      return
    }
    
    // ✅ Si está autenticado y no hay filtros, esperar a feedInit (solo en carga inicial sin cambios)
    if (isAuthenticated && !categoryId && !searchQuery && !filtersChanged) {
      // ✅ Si feedInit ya completó y tiene datos, no hacer nada
      if (isComplete && hasData.feed) {
        setIsLoading(false)
        hasLoadedRef.current = true
        return
      }
      
      // ✅ Si feedInit está cargando, esperar
      if (!isComplete) {
        setIsLoading(true)
        return
      }
      
      // ✅ Si feedInit completó pero no tiene datos de feed, cargar
      if (isComplete && !hasData.feed && !hasLoadedRef.current) {
        hasLoadedRef.current = true
        loadFeed()
        return
      }
    }
    
    // ✅ Si no está autenticado O hay filtros, cargar normalmente
    if (!isAuthenticated || categoryId || searchQuery) {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true
        loadFeed()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated, categoryId, searchQuery, isComplete, hasData.feed, options?.skipInitialLoad])

  // Función para actualizar un item específico sin recargar todo
  const updateItem = useCallback((itemId: string, updates: Partial<FeedItem>) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ))
  }, [])

  // Función para remover un item
  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    nextCursorToken,
    error,
    loadMore,
    reload: loadFeed,
    updateItem,
    removeItem,
  }
}

