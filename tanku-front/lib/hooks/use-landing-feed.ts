'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import type { FeedItem, FeedResponse } from '@/lib/types/feed.types'

const MAX_PRODUCTS = 100

// Cache global para productos del landing (por categoría)
type LandingFeedCache = {
  items: FeedItem[]
  categoryId: string | null
  timestamp: number
}
let landingFeedCache: LandingFeedCache | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export function useLandingFeed(filters: { categoryId?: string | null; searchQuery?: string } = {}) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const hasLoadedRef = useRef(false)

  // Cargar feed inicial (hasta 100 productos, sin posts)
  const loadFeed = useCallback(async () => {
    const categoryId = filters.categoryId ?? null
    
    // Verificar cache primero
    if (landingFeedCache && 
        landingFeedCache.categoryId === categoryId &&
        Date.now() - landingFeedCache.timestamp < CACHE_TTL) {
      setItems(landingFeedCache.items)
      setIsLoading(false)
      hasLoadedRef.current = true
      return
    }

    if (hasLoadedRef.current && !landingFeedCache) {
      return
    }

    setIsLoading(true)
    setItems([])
    setError(null)

    try {
      let url = '/api/v1/feed/public'
      const params = new URLSearchParams()
      if (filters.categoryId) {
        params.append('categoryId', filters.categoryId)
      }
      // No usar searchQuery aquí - la búsqueda se hace localmente
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      let allItems: FeedItem[] = []
      let currentCursor: string | null = null
      let attempts = 0
      const maxAttempts = 3 // Máximo 3 páginas (50 * 3 = 150 productos, pero nos detenemos en 100)

      // Cargar primera página
      const firstResponse = await apiClient.get<FeedResponse>(url, {})
      
      if (firstResponse.success && firstResponse.data) {
        let pageItems = firstResponse.data.items || []
        
        // Filtrar solo productos (no posts)
        pageItems = pageItems.filter(item => item.type === 'product')
        allItems = [...allItems, ...pageItems]
        
        currentCursor = typeof firstResponse.data.nextCursorToken === 'string' 
          ? firstResponse.data.nextCursorToken 
          : null

        // Cargar más páginas hasta tener 100 productos o no haya más
        // Optimización: solo cargar si realmente necesitamos más productos
        while (currentCursor && attempts < maxAttempts && allItems.length < MAX_PRODUCTS) {
          try {
            const moreHeaders: HeadersInit = {
              'X-Feed-Cursor': currentCursor,
            }
            
            // Mantener los mismos filtros si existen (solo categoría)
            let moreUrl = '/api/v1/feed/public'
            const moreParams = new URLSearchParams()
            if (filters.categoryId) {
              moreParams.append('categoryId', filters.categoryId)
            }
            // No usar searchQuery aquí - la búsqueda se hace localmente
            if (moreParams.toString()) {
              moreUrl += `?${moreParams.toString()}`
            }
            
            const moreResponse = await apiClient.get<FeedResponse>(moreUrl, moreHeaders)
            
            if (moreResponse.success && moreResponse.data) {
              let moreItems = moreResponse.data.items || []
              
              // Filtrar solo productos (no posts)
              moreItems = moreItems.filter(item => item.type === 'product')
              
              if (moreItems.length > 0) {
                // Agregar solo hasta llegar a 100 productos
                const remaining = MAX_PRODUCTS - allItems.length
                if (remaining > 0) {
                  allItems = [...allItems, ...moreItems.slice(0, remaining)]
                }
                
                // Actualizar cursor
                currentCursor = typeof moreResponse.data.nextCursorToken === 'string' 
                  ? moreResponse.data.nextCursorToken 
                  : null
                attempts++
                
                // Si ya tenemos 100 productos, salir
                if (allItems.length >= MAX_PRODUCTS) {
                  break
                }
              } else {
                break // No hay más items
              }
            } else {
              break // Error en la respuesta
            }
          } catch (err) {
            console.error(`[useLandingFeed] Error cargando página ${attempts + 2}:`, err)
            break // Salir del loop si hay error
          }
        }
        
        // Limitar a exactamente 100 productos
        allItems = allItems.slice(0, MAX_PRODUCTS)
        
        // Guardar en cache
        landingFeedCache = {
          items: allItems,
          categoryId: categoryId,
          timestamp: Date.now()
        }
        
        setItems(allItems)
        hasLoadedRef.current = true
      } else {
        setError(new Error(firstResponse.error?.message || 'Error cargando feed'))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'))
    } finally {
      setIsLoading(false)
    }
  }, [filters.categoryId])

  // Cargar feed cuando cambian los filtros (solo categoría, no búsqueda)
  const categoryId = filters.categoryId ?? null
  const previousCategoryRef = useRef<string | null>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Solo detectar cambio de categoría (la búsqueda se hace localmente)
    const categoryChanged = previousCategoryRef.current !== categoryId

    // Actualizar referencia
    previousCategoryRef.current = categoryId

    // Si es el montaje inicial, cargar
    if (isInitialMount.current) {
      isInitialMount.current = false
      if (!hasLoadedRef.current) {
        loadFeed()
      }
      return
    }

    // Si hay un cambio de categoría, resetear y cargar
    if (categoryChanged) {
      hasLoadedRef.current = false
      // Limpiar cache de la categoría anterior
      if (landingFeedCache && landingFeedCache.categoryId !== categoryId) {
        landingFeedCache = null
      }
      loadFeed()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  return {
    items,
    isLoading,
    error,
    reload: loadFeed,
  }
}

