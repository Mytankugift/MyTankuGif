'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { mapCategoryFromApi, type FeedCategoryItem } from '@/lib/feed/category-tree'

// Cache por contexto: anónimo vs JWT (el backend filtra +18 según edad del usuario)
const categoriesCache: Record<string, FeedCategoryItem[]> = {}
const categoriesLoadingPromise: Record<string, Promise<FeedCategoryItem[]> | null> = {}

function cacheKeyForToken(token: string | null): string {
  if (!token) return 'anon'
  return `auth:${token.slice(-20)}`
}

const INVALIDATE_EVENT = 'tanku-categories-invalidate'

export function useCategories() {
  const token = useAuthStore((s) => s.token)
  const key = cacheKeyForToken(token)

  const [categories, setCategories] = useState<FeedCategoryItem[]>(() => categoriesCache[key] || [])
  const [isLoading, setIsLoading] = useState(!categoriesCache[key])
  /** Se incrementa al llamar clearCategoriesCache() para forzar refetch en clientes montados */
  const [invalidateSeq, setInvalidateSeq] = useState(0)

  useEffect(() => {
    const onInvalidate = () => setInvalidateSeq((n) => n + 1)
    if (typeof window !== 'undefined') {
      window.addEventListener(INVALIDATE_EVENT, onInvalidate)
      return () => window.removeEventListener(INVALIDATE_EVENT, onInvalidate)
    }
    return undefined
  }, [])

  useEffect(() => {
    if (categoriesCache[key]) {
      setCategories(categoriesCache[key])
      setIsLoading(false)
      return
    }

    if (categoriesLoadingPromise[key]) {
      categoriesLoadingPromise[key]!
        .then((data) => {
          setCategories(data)
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
        })
      return
    }

    setIsLoading(true)
    categoriesLoadingPromise[key] = (async () => {
      try {
        const response = await apiClient.get<
          Array<{
            id: string
            name: string
            handle: string
            imageUrl?: string | null
            parentId?: string | null
          }>
        >(API_ENDPOINTS.CATEGORIES.LIST)

        if (response.success && Array.isArray(response.data)) {
          const mappedCategories = response.data.map((cat) => mapCategoryFromApi(cat))
          categoriesCache[key] = mappedCategories
          return mappedCategories
        }
        throw new Error('Error cargando categorías')
      } catch (error) {
        console.error('Error cargando categorías:', error)
        throw error
      } finally {
        categoriesLoadingPromise[key] = null
      }
    })()

    categoriesLoadingPromise[key]!
      .then((data) => {
        setCategories(data)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [key, invalidateSeq])

  return { categories, isLoading }
}

export function clearCategoriesCache() {
  Object.keys(categoriesCache).forEach((k) => delete categoriesCache[k])
  Object.keys(categoriesLoadingPromise).forEach((k) => delete categoriesLoadingPromise[k])
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(INVALIDATE_EVENT))
  }
}
