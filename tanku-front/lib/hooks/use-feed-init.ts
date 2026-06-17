'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { useFeedInitContext } from '@/lib/context/feed-init-context'
import { seedChatConversations } from '@/lib/hooks/use-chat'
import { seedFeedStories } from '@/lib/hooks/use-stories'
import { logger } from '@/lib/utils/logger'
import type { FeedItem, FeedResponse } from '@/lib/types/feed.types'
import { mapCategoryFromApi, type FeedCategoryItem } from '@/lib/feed/category-tree'

// ✅ Fase 2 (carga progresiva): si está activo, useFeedInit pide primero
// /feed/init-critical (desbloquea render) y luego /feed/init-secondary (rellena
// nav/badges). Apagado por defecto → mantiene el comportamiento monolítico
// (/feed/init) como fallback seguro.
const FEED_PROGRESSIVE_INIT = process.env.NEXT_PUBLIC_FEED_PROGRESSIVE_INIT === 'true'

type AuthPersistApi = {
  hasHydrated: () => boolean
  onFinishHydration: (fn: () => void) => () => void
}

function getAuthPersist(): AuthPersistApi | undefined {
  const p = (useAuthStore as unknown as { persist?: AuthPersistApi }).persist
  return typeof p?.hasHydrated === 'function' && typeof p?.onFinishHydration === 'function'
    ? p
    : undefined
}

interface FeedInitResponse {
  feed: FeedResponse
  categories: Array<{
    id: string
    name: string
    handle: string
    imageUrl: string | null
    parentId?: string | null
    parent_id?: string | null
  }>
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

type SecondaryData = Pick<
  FeedInitResponse,
  'cart' | 'stories' | 'conversations' | 'unreadCounts' | 'notifications' | 'user' | 'onboardingData'
>

export function useFeedInit() {
  const { token, isAuthenticated, checkAuth } = useAuthStore()
  const { markComplete } = useFeedInitContext()
  const [authHydrated, setAuthHydrated] = useState(false)
  const [authResolved, setAuthResolved] = useState(false)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [categories, setCategories] = useState<FeedCategoryItem[]>([])
  const [cart, setCart] = useState<any | null>(null)
  const [stories, setStories] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [unreadCounts, setUnreadCounts] = useState({ chat: 0, notifications: 0 })
  const [notifications, setNotifications] = useState<any[]>([])
  const [user, setUser] = useState<any | null>(null)
  const [onboardingData, setOnboardingData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursorToken, setNextCursorToken] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const hasLoadedRef = useRef(false) // ✅ Guard para evitar múltiples cargas (tras completar)
  const isLoadingFeedInitRef = useRef(false) // ✅ Guard in-flight: evita /feed/init concurrentes mientras la 1ª está en vuelo

  // Procesa la primera página del feed. Para anónimos, encadena hasta 3 páginas
  // de /feed/public para tener ≥100 productos (igual que el comportamiento previo).
  const applyFeed = useCallback(async (feed: FeedResponse | undefined): Promise<FeedItem[]> => {
    const { isAuthenticated: currentAuth } = useAuthStore.getState()
    let validItems = feed?.items || []
    let safeCursor = typeof feed?.nextCursorToken === 'string' ? feed.nextCursorToken : null

    if (!currentAuth && safeCursor && validItems.length > 0) {
      let currentCursor: string | null = safeCursor
      let attempts = 0
      const maxAttempts = 3

      while (currentCursor && attempts < maxAttempts && validItems.length < 100) {
        try {
          const moreHeaders: HeadersInit = { 'X-Feed-Cursor': currentCursor }
          const moreResponse: Awaited<ReturnType<typeof apiClient.get<FeedResponse>>> =
            await apiClient.get<FeedResponse>('/api/v1/feed/public', moreHeaders)

          if (moreResponse.success && moreResponse.data) {
            const moreItems = moreResponse.data.items || []
            if (moreItems.length > 0) {
              validItems = [...validItems, ...moreItems]
              currentCursor = typeof moreResponse.data.nextCursorToken === 'string'
                ? moreResponse.data.nextCursorToken
                : null
              attempts++
              logger.log(`[useFeedInit] Página ${attempts + 1} cargada:`, {
                itemsCount: moreItems.length,
                totalItems: validItems.length,
                hasNextCursorToken: !!currentCursor,
              })
            } else {
              break
            }
          } else {
            break
          }
        } catch (err) {
          console.error(`[useFeedInit] Error cargando página ${attempts + 2}:`, err)
          break
        }
      }
      safeCursor = currentCursor
    }

    setFeedItems(validItems)
    setNextCursorToken(safeCursor)
    setHasMore(!!safeCursor)
    return validItems
  }, [])

  const applyCategories = useCallback((cats: FeedInitResponse['categories'] | undefined) => {
    if (Array.isArray(cats)) {
      setCategories(cats.map((c) => mapCategoryFromApi(c)))
    }
  }, [])

  // Aplica el "chrome" no bloqueante y siembra los caches compartidos para que
  // otros componentes no vuelvan a pedir /chat/conversations, /stories ni /cart.
  const applySecondary = useCallback((data: SecondaryData) => {
    setCart(data.cart || null)
    setStories(data.stories || [])
    setConversations(data.conversations || [])
    setUnreadCounts(data.unreadCounts || { chat: 0, notifications: 0 })
    setNotifications(data.notifications || [])
    setUser(data.user || null)
    setOnboardingData(data.onboardingData || null)

    if (data.cart) {
      useCartStore.getState().setNormalCart(data.cart, { silent: true })
    }

    const { user: currentUser } = useAuthStore.getState()
    if (currentUser?.id) {
      seedChatConversations(currentUser.id, data.conversations || [])
      seedFeedStories(currentUser.id, data.stories || [])
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('feedInit_complete', 'true')
    }
  }, [])

  // Camino legacy (fallback): un solo /feed/init monolítico.
  const loadLegacy = useCallback(async () => {
    const { token: currentToken } = useAuthStore.getState()
    const headers: HeadersInit = {}
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`

    const response = await apiClient.get<FeedInitResponse>('/api/v1/feed/init', headers)
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Error cargando datos iniciales')
    }

    const data = response.data
    const validItems = await applyFeed(data.feed)
    applyCategories(data.categories)
    applySecondary(data)

    markComplete({
      feed: validItems.length > 0,
      stories: (data.stories || []).length > 0,
      conversations: (data.conversations || []).length > 0,
      notifications: (data.notifications || []).length > 0,
      cart: !!data.cart,
      onboarding: !!data.onboardingData,
    })
  }, [applyFeed, applyCategories, applySecondary, markComplete])

  // Camino progresivo (Fase 2): crítico desbloquea render, secundario rellena.
  const loadProgressive = useCallback(async () => {
    const { token: currentToken } = useAuthStore.getState()
    const headers: HeadersInit = {}
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`

    // 1) Crítico (bloqueante): feed + categorías → render lo antes posible.
    const criticalRes = await apiClient.get<{ feed: FeedResponse; categories: FeedInitResponse['categories'] }>(
      '/api/v1/feed/init-critical',
      headers,
    )
    if (!criticalRes.success || !criticalRes.data) {
      throw new Error(criticalRes.error?.message || 'Error cargando feed inicial')
    }
    const validItems = await applyFeed(criticalRes.data.feed)
    applyCategories(criticalRes.data.categories)
    setIsLoading(false) // ✅ render desbloqueado; el resto llega después

    // 2) Secundario (no bloqueante): si falla, el feed ya funciona.
    let secondary: SecondaryData = {
      cart: null,
      stories: [],
      conversations: [],
      unreadCounts: { chat: 0, notifications: 0 },
      notifications: [],
      user: null,
      onboardingData: null,
    }
    try {
      const secRes = await apiClient.get<SecondaryData>('/api/v1/feed/init-secondary', headers)
      if (secRes.success && secRes.data) {
        secondary = secRes.data
        applySecondary(secondary)
      }
    } catch (err) {
      logger.log('[useFeedInit] init-secondary falló (no bloqueante):', err)
    }

    // markComplete tras sembrar caches para no re-disparar fetches en cascada.
    markComplete({
      feed: validItems.length > 0,
      stories: (secondary.stories || []).length > 0,
      conversations: (secondary.conversations || []).length > 0,
      notifications: (secondary.notifications || []).length > 0,
      cart: !!secondary.cart,
      onboarding: !!secondary.onboardingData,
    })
  }, [applyFeed, applyCategories, applySecondary, markComplete])

  // Cargar datos iniciales (con guard in-flight y de "ya cargado").
  const loadFeedInit = useCallback(async () => {
    // ✅ Si ya se cargó O hay una carga en vuelo, no volver a cargar.
    // El guard in-flight es clave: el init tarda ~segundos y, sin él, los
    // re-renders durante ese lapso disparaban varias peticiones concurrentes.
    if (hasLoadedRef.current || isLoadingFeedInitRef.current) {
      logger.log('[useFeedInit] Ya se cargó o está en curso, omitiendo carga duplicada')
      return
    }
    isLoadingFeedInitRef.current = true

    setIsLoading(true)
    setError(null)

    try {
      if (FEED_PROGRESSIVE_INIT) {
        await loadProgressive()
      } else {
        await loadLegacy()
      }
      hasLoadedRef.current = true // ✅ Marcar como cargado
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'))
    } finally {
      setIsLoading(false)
      isLoadingFeedInitRef.current = false
    }
  }, [loadProgressive, loadLegacy])

  // Cargar más items del feed (usando endpoint normal, no batch)
  const loadMore = useCallback(async () => {
    if (!nextCursorToken || !hasMore || isLoadingMore) {
      return
    }

    setIsLoadingMore(true)
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
    } finally {
      setIsLoadingMore(false)
    }
  }, [nextCursorToken, hasMore, isLoadingMore, token, isAuthenticated])

  useEffect(() => {
    const persist = getAuthPersist()
    if (!persist) {
      queueMicrotask(() => setAuthHydrated(true))
      return
    }
    if (persist.hasHydrated()) {
      setAuthHydrated(true)
    }
    return persist.onFinishHydration(() => {
      setAuthHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (!authHydrated) return
    let cancelled = false
    ;(async () => {
      const { token: t, isAuthenticated: auth } = useAuthStore.getState()
      if (t && !auth) {
        await checkAuth()
      }
      if (!cancelled) setAuthResolved(true)
    })()
    return () => {
      cancelled = true
    }
  }, [authHydrated, checkAuth])

  useEffect(() => {
    if (!authResolved || hasLoadedRef.current) return
    loadFeedInit()
  }, [authResolved, loadFeedInit])

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
    isLoadingMore,
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

