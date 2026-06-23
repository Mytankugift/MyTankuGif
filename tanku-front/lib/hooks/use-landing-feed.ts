'use client'

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { resetLandingScroll } from '@/lib/landing/landing-scroll'
import type { FeedItem, FeedResponse } from '@/lib/types/feed.types'

const MAX_PRODUCTS = 100
const CACHE_TTL = 5 * 60 * 1000
const SESSION_KEY = 'tanku-landing-feed-v1'

type LandingFeedCache = {
  items: FeedItem[]
  categoryId: string | null
  nextCursorToken: string | null
  timestamp: number
}

let landingFeedCache: LandingFeedCache | null = null

function countProducts(items: FeedItem[]): number {
  return items.filter((i) => i.type === 'product').length
}

function mergeFeedItems(prev: FeedItem[], next: FeedItem[]): FeedItem[] {
  if (next.length === 0) return prev
  const seen = new Set(prev.map((i) => i.id))
  const merged = [...prev]
  for (const item of next) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      merged.push(item)
    }
  }
  return merged
}

function buildPublicFeedUrl(categoryId: string | null): string {
  if (!categoryId) return '/api/v1/feed/public'
  const params = new URLSearchParams({ categoryId })
  return `/api/v1/feed/public?${params.toString()}`
}

function readSessionCache(categoryId: string | null): LandingFeedCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LandingFeedCache
    if (parsed.categoryId !== categoryId) return null
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

function persistLandingCache(data: LandingFeedCache) {
  landingFeedCache = data
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch {
    // Quota u otro error de storage: el grid en memoria sigue funcionando en la sesión actual.
  }
}

function clearPersistedLandingCache() {
  landingFeedCache = null
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }
}

async function fetchPublicFeedPage(
  categoryId: string | null,
  cursor?: string,
): Promise<FeedResponse | null> {
  const headers: HeadersInit = cursor ? { 'X-Feed-Cursor': cursor } : {}
  const response = await apiClient.get<FeedResponse>(buildPublicFeedUrl(categoryId), headers)
  if (!response.success || !response.data) return null
  return response.data
}

async function loadRemainingPublicPages(
  categoryId: string | null,
  startCursor: string,
  initialItems: FeedItem[],
  onProgress: (items: FeedItem[], cursor: string | null) => void,
): Promise<void> {
  let currentCursor: string | null = startCursor
  let accumulated = initialItems

  while (currentCursor && countProducts(accumulated) < MAX_PRODUCTS) {
    const page = await fetchPublicFeedPage(categoryId, currentCursor)
    if (!page?.items?.length) break

    accumulated = mergeFeedItems(accumulated, page.items)
    currentCursor = typeof page.nextCursorToken === 'string' ? page.nextCursorToken : null
    onProgress(accumulated, currentCursor)

    if (countProducts(accumulated) >= MAX_PRODUCTS) break
  }
}

function scheduleBackgroundLoad(run: () => void) {
  if (typeof window === 'undefined') return
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 2000 })
  } else {
    window.setTimeout(run, 80)
  }
}

function getStoredCache(categoryId: string | null): LandingFeedCache | null {
  if (
    landingFeedCache &&
    landingFeedCache.categoryId === categoryId &&
    Date.now() - landingFeedCache.timestamp < CACHE_TTL
  ) {
    return landingFeedCache
  }
  return readSessionCache(categoryId)
}

function continueFromCache(
  cache: LandingFeedCache,
  runBackgroundPages: (cursor: string, baseItems: FeedItem[]) => void,
  revalidateInBackground: (cached: LandingFeedCache) => void,
) {
  if (cache.nextCursorToken && countProducts(cache.items) < MAX_PRODUCTS) {
    scheduleBackgroundLoad(() => runBackgroundPages(cache.nextCursorToken!, cache.items))
  } else {
    revalidateInBackground(cache)
  }
}

export function useLandingFeed(filters: { categoryId?: string | null } = {}) {
  const categoryId = filters.categoryId ?? null

  // Estado inicial idéntico en SSR y en el 1.er render del cliente (evita hydration mismatch).
  const [items, setItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [nextCursorToken, setNextCursorToken] = useState<string | null>(null)

  const hasLoadedRef = useRef(false)
  const loadMoreInFlightRef = useRef(false)
  const categoryIdRef = useRef(categoryId)
  categoryIdRef.current = categoryId

  const applyCache = useCallback((cache: LandingFeedCache) => {
    persistLandingCache(cache)
    setItems(cache.items)
    setNextCursorToken(cache.nextCursorToken)
    setIsLoading(false)
    hasLoadedRef.current = true
  }, [])

  const runBackgroundPages = useCallback(
    (cursor: string, baseItems: FeedItem[]) => {
      if (loadMoreInFlightRef.current) return
      loadMoreInFlightRef.current = true
      setIsLoadingMore(true)

      const activeCategoryId = categoryIdRef.current

      void loadRemainingPublicPages(activeCategoryId, cursor, baseItems, (nextItems, nextCursor) => {
        const payload: LandingFeedCache = {
          items: nextItems,
          categoryId: activeCategoryId,
          nextCursorToken: nextCursor,
          timestamp: Date.now(),
        }
        applyCache(payload)
      })
        .catch((err) => {
          console.error('[useLandingFeed] Error cargando más páginas:', err)
        })
        .finally(() => {
          setIsLoadingMore(false)
          loadMoreInFlightRef.current = false
        })
    },
    [applyCache],
  )

  const fetchFirstPage = useCallback(async (): Promise<{
    items: FeedItem[]
    cursor: string | null
  } | null> => {
    const page = await fetchPublicFeedPage(categoryIdRef.current)
    if (!page?.items?.length) return null
    const cursor = typeof page.nextCursorToken === 'string' ? page.nextCursorToken : null
    return { items: page.items, cursor }
  }, [])

  const revalidateInBackground = useCallback(
    (cached: LandingFeedCache) => {
      scheduleBackgroundLoad(() => {
        void (async () => {
          setIsRevalidating(true)
          try {
            const fresh = await fetchFirstPage()
            if (!fresh) return

            const merged = mergeFeedItems(cached.items, fresh.items)
            const cursor = fresh.cursor ?? cached.nextCursorToken
            const payload: LandingFeedCache = {
              items: merged,
              categoryId: categoryIdRef.current,
              nextCursorToken: cursor,
              timestamp: Date.now(),
            }
            applyCache(payload)

            if (cursor && countProducts(merged) < MAX_PRODUCTS) {
              runBackgroundPages(cursor, merged)
            }
          } catch (err) {
            console.error('[useLandingFeed] Error revalidando feed:', err)
            if (cached.nextCursorToken && countProducts(cached.items) < MAX_PRODUCTS) {
              runBackgroundPages(cached.nextCursorToken, cached.items)
            }
          } finally {
            setIsRevalidating(false)
          }
        })()
      })
    },
    [applyCache, fetchFirstPage, runBackgroundPages],
  )

  const loadFeedFromNetwork = useCallback(async () => {
    setIsLoading(true)
    setItems([])
    setError(null)
    setNextCursorToken(null)
    hasLoadedRef.current = false

    try {
      const first = await fetchFirstPage()
      if (!first) {
        setError(new Error('Error cargando feed'))
        setIsLoading(false)
        return
      }

      const payload: LandingFeedCache = {
        items: first.items,
        categoryId: categoryIdRef.current,
        nextCursorToken: first.cursor,
        timestamp: Date.now(),
      }
      applyCache(payload)

      if (first.cursor && countProducts(first.items) < MAX_PRODUCTS) {
        scheduleBackgroundLoad(() => runBackgroundPages(first.cursor!, first.items))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'))
      setIsLoading(false)
    }
  }, [applyCache, fetchFirstPage, runBackgroundPages])

  const loadFeed = useCallback(async () => {
    const activeCategoryId = categoryIdRef.current
    const stored = getStoredCache(activeCategoryId)

    if (stored) {
      applyCache(stored)
      continueFromCache(stored, runBackgroundPages, revalidateInBackground)
      return
    }

    await loadFeedFromNetwork()
  }, [applyCache, loadFeedFromNetwork, revalidateInBackground, runBackgroundPages])

  const bootstrappedRef = useRef(false)

  // Tras hidratar: leer sessionStorage antes del paint (F5 rápido sin mismatch).
  useLayoutEffect(() => {
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true

    const stored = getStoredCache(categoryIdRef.current)
    if (stored) {
      applyCache(stored)
      resetLandingScroll()
      continueFromCache(stored, runBackgroundPages, revalidateInBackground)
      return
    }

    void loadFeedFromNetwork()
  }, [applyCache, loadFeedFromNetwork, revalidateInBackground, runBackgroundPages])

  const previousCategoryRef = useRef(categoryId)

  useEffect(() => {
    if (previousCategoryRef.current === categoryId) return
    previousCategoryRef.current = categoryId

    hasLoadedRef.current = false
    loadMoreInFlightRef.current = false
    clearPersistedLandingCache()
    void loadFeedFromNetwork()
  }, [categoryId, loadFeedFromNetwork])

  const updateItem = useCallback((itemId: string, updates: Partial<FeedItem>) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
      if (landingFeedCache) {
        persistLandingCache({ ...landingFeedCache, items: next, timestamp: Date.now() })
      }
      return next
    })
  }, [])

  return {
    items,
    isLoading,
    isLoadingMore,
    isRevalidating,
    hasMore: !!nextCursorToken && countProducts(items) < MAX_PRODUCTS,
    error,
    reload: loadFeed,
    updateItem,
  }
}
