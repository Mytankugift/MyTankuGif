'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { ProductDTO } from '@/types/api'

// Cache global para productos
type ProductCache = {
  product: ProductDTO
  timestamp: number
}
const productCache = new Map<string, ProductCache>()
const PRODUCT_CACHE_TTL = 10 * 60 * 1000 // 10 minutos

// Peticiones en curso para evitar duplicados
const pendingRequests = new Map<string, Promise<ProductDTO | null>>()

interface UseProductOptions {
  enabled?: boolean // Permitir deshabilitar la carga automática
}

export function useProduct(handle: string | null, options: UseProductOptions = {}) {
  const { enabled = true } = options
  const [product, setProduct] = useState<ProductDTO | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchProduct = useCallback(async (productHandle: string) => {
    // Verificar cache primero
    const cached = productCache.get(productHandle)
    if (cached && Date.now() - cached.timestamp < PRODUCT_CACHE_TTL) {
      setProduct(cached.product)
      setIsLoading(false)
      return
    }

    // Si ya hay una petición en curso para este producto, esperarla
    const pendingRequest = pendingRequests.get(productHandle)
    if (pendingRequest) {
      try {
        const result = await pendingRequest
        if (result) {
          setProduct(result)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error desconocido'))
        setProduct(null)
      } finally {
        setIsLoading(false)
      }
      return
    }

    setIsLoading(true)
    setError(null)

    // Crear la petición y guardarla en el mapa de peticiones pendientes
    const requestPromise = (async () => {
      try {
        const response = await apiClient.get<ProductDTO>(
          API_ENDPOINTS.PRODUCTS.BY_HANDLE(productHandle)
        )

        if (response.success && response.data) {
          // Agregar propiedades de compatibilidad si no existen
          const enrichedProduct: ProductDTO = {
            ...response.data,
            // Agregar thumbnail si no existe (primera imagen)
            thumbnail: response.data.thumbnail ?? response.data.images?.[0] ?? undefined,
            // Agregar price si no existe (precio mínimo de variantes)
            price: response.data.price || 
              (response.data.variants?.length > 0 
                ? Math.min(...response.data.variants.map(v => v.tankuPrice))
                : undefined),
          }
          
          // Guardar en cache
          productCache.set(productHandle, {
            product: enrichedProduct,
            timestamp: Date.now()
          })
          
          return enrichedProduct
        } else {
          const errorMessage = response.error?.message || 'Producto no encontrado'
          throw new Error(errorMessage)
        }
      } catch (err) {
        throw err
      } finally {
        // Remover de peticiones pendientes
        pendingRequests.delete(productHandle)
      }
    })()

    // Guardar la petición en el mapa
    pendingRequests.set(productHandle, requestPromise)

    try {
      const enrichedProduct = await requestPromise
      setProduct(enrichedProduct)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(new Error(errorMessage))
      setProduct(null)
      console.error('[useProduct] Error obteniendo producto:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Cargar producto cuando cambia el handle y está habilitado
  useEffect(() => {
    if (enabled && handle) {
      fetchProduct(handle)
    } else if (!handle) {
      setProduct(null)
      setError(null)
    }
  }, [handle, enabled, fetchProduct])

  return {
    product,
    isLoading,
    error,
    refetch: () => handle ? fetchProduct(handle) : Promise.resolve(),
  }
}

/**
 * Función helper para obtener producto por handle (útil fuera de componentes)
 * Usa el mismo cache que useProduct y evita peticiones duplicadas
 */
export async function fetchProductByHandle(handle: string): Promise<ProductDTO | null> {
  // Verificar cache primero
  const cached = productCache.get(handle)
  if (cached && Date.now() - cached.timestamp < PRODUCT_CACHE_TTL) {
    return cached.product
  }

  // Si ya hay una petición en curso, esperarla
  const pendingRequest = pendingRequests.get(handle)
  if (pendingRequest) {
    try {
      return await pendingRequest
    } catch {
      return null
    }
  }

  // Crear nueva petición
  const requestPromise = (async () => {
    try {
      const response = await apiClient.get<ProductDTO>(
        API_ENDPOINTS.PRODUCTS.BY_HANDLE(handle)
      )

      if (response.success && response.data) {
        // Agregar propiedades de compatibilidad
        const enrichedProduct: ProductDTO = {
          ...response.data,
          thumbnail: response.data.thumbnail ?? response.data.images?.[0] ?? undefined,
          price: response.data.price || 
            (response.data.variants?.length > 0 
              ? Math.min(...response.data.variants.map(v => v.tankuPrice))
              : undefined),
        }
        
        // Guardar en cache
        productCache.set(handle, {
          product: enrichedProduct,
          timestamp: Date.now()
        })
        
        return enrichedProduct
      }
      
      return null
    } catch (error) {
      console.error('[fetchProductByHandle] Error:', error)
      throw error
    } finally {
      // Remover de peticiones pendientes
      pendingRequests.delete(handle)
    }
  })()

  // Guardar la petición en el mapa
  pendingRequests.set(handle, requestPromise)

  try {
    return await requestPromise
  } catch {
    return null
  }
}

