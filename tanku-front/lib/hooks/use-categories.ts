'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

// Cache global para categorías (se mantiene durante la sesión)
let categoriesCache: Array<{ id: string; name: string; image?: string | null }> | null = null
let categoriesLoadingPromise: Promise<Array<{ id: string; name: string; image?: string | null }>> | null = null

export function useCategories() {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; image?: string | null }>>(
    categoriesCache || []
  )
  const [isLoading, setIsLoading] = useState(!categoriesCache)

  useEffect(() => {
    // Si ya tenemos el cache, actualizar estado y salir
    if (categoriesCache) {
      setCategories(categoriesCache)
      setIsLoading(false)
      return
    }

    // Si ya hay una petición en curso, esperarla
    if (categoriesLoadingPromise) {
      categoriesLoadingPromise
        .then((data) => {
          setCategories(data)
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
        })
      return
    }

    // Crear nueva petición
    setIsLoading(true)
    categoriesLoadingPromise = (async () => {
      try {
        const response = await apiClient.get<Array<{ id: string; name: string; handle: string; imageUrl?: string | null }>>(
          API_ENDPOINTS.CATEGORIES.LIST
        )

        if (response.success && Array.isArray(response.data)) {
          const mappedCategories = response.data.map(cat => ({
            id: cat.id,
            name: cat.name,
            image: cat.imageUrl || null,
          }))
          
          // Guardar en cache
          categoriesCache = mappedCategories
          return mappedCategories
        } else {
          throw new Error('Error cargando categorías')
        }
      } catch (error) {
        console.error('Error cargando categorías:', error)
        throw error
      } finally {
        categoriesLoadingPromise = null
      }
    })()

    // Esperar la petición y actualizar estado
    categoriesLoadingPromise
      .then((data) => {
        setCategories(data)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [])

  return { categories, isLoading }
}

// Función para limpiar el cache si es necesario (útil para testing o refresh manual)
export function clearCategoriesCache() {
  categoriesCache = null
  categoriesLoadingPromise = null
}
