'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import type { FeedItem, FeedResponse } from '@/lib/types/feed.types'

const MAX_ITEMS = 100

type LandingFeedCache = {
  items: FeedItem[]
  categoryId: string | null
  timestamp: number
}
let landingFeedCache: LandingFeedCache | null = null
const CACHE_TTL = 5 * 60 * 1000

export function useLandingFeed(filters: { categoryId?: string | null; searchQuery?: string } = {}) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const hasLoadedRef = useRef(false)

  const loadFeed = useCallback(async () => {
    const categoryId = filters.categoryId ?? null

    if (
      landingFeedCache &&
      landingFeedCache.categoryId === categoryId &&
      Date.now() - landingFeedCache.timestamp < CACHE_TTL
    ) {
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
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const firstResponse = await apiClient.get<FeedResponse>(url, {})

      if (firstResponse.success && firstResponse.data) {
        const allItems = (firstResponse.data.items || []).slice(0, MAX_ITEMS)

        landingFeedCache = {
          items: allItems,
          categoryId,
          timestamp: Date.now(),
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

  const categoryId = filters.categoryId ?? null
  const previousCategoryRef = useRef<string | null>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    const categoryChanged = previousCategoryRef.current !== categoryId
    previousCategoryRef.current = categoryId

    if (isInitialMount.current) {
      isInitialMount.current = false
      if (!hasLoadedRef.current) {
        loadFeed()
      }
      return
    }

    if (categoryChanged) {
      hasLoadedRef.current = false
      if (landingFeedCache && landingFeedCache.categoryId !== categoryId) {
        landingFeedCache = null
      }
      loadFeed()
    }
  }, [categoryId, loadFeed])

  const updateItem = useCallback((itemId: string, updates: Partial<FeedItem>) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
      if (landingFeedCache) {
        landingFeedCache = { ...landingFeedCache, items: next, timestamp: Date.now() }
      }
      return next
    })
  }, [])

  return {
    items,
    isLoading,
    error,
    reload: loadFeed,
    updateItem,
  }
}
