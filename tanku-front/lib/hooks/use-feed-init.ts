'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { useFeedInitContext } from '@/lib/context/feed-init-context'
import type { FeedItem, FeedResponse } from '@/lib/types/feed.types'

interface FeedInitResponse {
  feed: FeedResponse
  categories: Array<{ id: string; name: string; handle: string; imageUrl: string | null }>
  cart: any | null
  stories: any[]
  conversations: any[]
  unreadCounts: {
    chat: number
    notifications: number
  }
  notifications: any[]
  user: any | null
  onboardingData: any | null
}

export function useFeedInit() {
  const { token, isAuthenticated } = useAuthStore()
  const { markComplete } = useFeedInitContext()
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string; image: string | null }>>([])
  const [cart, setCart] = useState<any | null>(null)
  const [stories, setStories] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [unreadCounts, setUnreadCounts] = useState({ chat: 0, notifications: 0 })
  const [notifications, setNotifications] = useState<any[]>([])
  const [user, setUser] = useState<any | null>(null)
  const [onboardingData, setOnboardingData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [nextCursorToken, setNextCursorToken] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const hasLoadedRef = useRef(false) // ✅ Guard para evitar múltiples cargas

  // Cargar datos iniciales usando endpoint batch
  const loadFeedInit = useCallback(async () => {
    // ✅ Si ya se cargó, no volver a cargar
    if (hasLoadedRef.current) {
      console.log('[useFeedInit] Ya se cargó, omitiendo carga duplicada')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await apiClient.get<FeedInitResponse>('/api/v1/feed/init', headers)

      if (response.success && response.data) {
        // Procesar feed
        let validItems = response.data.feed?.items || []
        let safeCursor = typeof response.data.feed?.nextCursorToken === 'string' 
          ? response.data.feed.nextCursorToken 
          : null

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
              
              const moreResponse: Awaited<ReturnType<typeof apiClient.get<FeedResponse>>> = await apiClient.get<FeedResponse>('/api/v1/feed/public', moreHeaders)
              
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
                  
                  console.log(`[useFeedInit] Página ${attempts + 1} cargada:`, {
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
              console.error(`[useFeedInit] Error cargando página ${attempts + 2}:`, err)
              break // Salir del loop si hay error
            }
          }
          
          // Actualizar el cursor final
          safeCursor = currentCursor
        }

        setFeedItems(validItems)
        setNextCursorToken(safeCursor)
        setHasMore(!!safeCursor)

        // Procesar categorías
        if (Array.isArray(response.data.categories)) {
          setCategories(response.data.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            image: c.imageUrl || null,
          })))
        }

        // Procesar otros datos
        setCart(response.data.cart || null)
        setStories(response.data.stories || [])
        setConversations(response.data.conversations || [])
        setUnreadCounts(response.data.unreadCounts || { chat: 0, notifications: 0 })
        setNotifications(response.data.notifications || [])
        setUser(response.data.user || null)
        setOnboardingData(response.data.onboardingData || null)
        
        // ✅ Actualizar el store del carrito si hay datos
        if (response.data.cart) {
          useCartStore.getState().setNormalCart(response.data.cart)
        }
        
        // ✅ Marcar feedInit como completado en el contexto (fuente única de verdad)
        markComplete({
          feed: validItems.length > 0,
          stories: (response.data.stories || []).length > 0,
          conversations: (response.data.conversations || []).length > 0,
          notifications: (response.data.notifications || []).length > 0,
          cart: !!response.data.cart,
          onboarding: !!response.data.onboardingData,
        })
        
        hasLoadedRef.current = true // ✅ Marcar como cargado
      } else {
        setError(new Error(response.error?.message || 'Error cargando datos iniciales'))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'))
    } finally {
      setIsLoading(false)
    }
  }, [token, isAuthenticated, markComplete])

  // Cargar más items del feed (usando endpoint normal, no batch)
  const loadMore = useCallback(async () => {
    if (!nextCursorToken || !hasMore) {
      return
    }

    try {
      const headers: HeadersInit = {
        'X-Feed-Cursor': nextCursorToken,
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const url = isAuthenticated ? '/api/v1/feed' : '/api/v1/feed/public'
      const response = await apiClient.get<FeedResponse>(url, headers)

      if (response.success && response.data) {
        const validItems = response.data.items || []
        const safeCursor = typeof response.data.nextCursorToken === 'string' 
          ? response.data.nextCursorToken 
          : null

        // Filtrar duplicados
        setFeedItems((prev) => {
          const existingIds = new Set(prev.map(item => item.id))
          const newItems = validItems.filter(item => !existingIds.has(item.id))
          return [...prev, ...newItems]
        })

        setNextCursorToken(safeCursor)
        setHasMore(!!safeCursor)
      }
    } catch (err) {
      console.error('Error cargando más items:', err)
    }
  }, [nextCursorToken, hasMore, token, isAuthenticated])

  // Cargar datos al montar (solo una vez)
  useEffect(() => {
    // ✅ Cargar siempre (tanto autenticado como no autenticado)
    // El endpoint /api/v1/feed/init funciona con optionalAuthenticate
    if (hasLoadedRef.current) {
      return
    }
    
    loadFeedInit()
  }, [loadFeedInit])

  // Función para actualizar un item específico
  const updateItem = useCallback((itemId: string, updates: Partial<FeedItem>) => {
    setFeedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ))
  }, [])

  // Función para remover un item
  const removeItem = useCallback((itemId: string) => {
    setFeedItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  return {
    // Feed data
    items: feedItems,
    isLoading,
    hasMore,
    nextCursorToken,
    error,
    loadMore,
    reload: loadFeedInit,
    updateItem,
    removeItem,
    // Other data
    categories,
    cart,
    stories,
    conversations,
    unreadCounts,
    notifications,
    user,
    onboardingData,
  }
}

