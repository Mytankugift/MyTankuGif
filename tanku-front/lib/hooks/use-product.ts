'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { ProductDTO } from '@/types/api'

interface UseProductOptions {
  enabled?: boolean // Permitir deshabilitar la carga automática
}

export function useProduct(handle: string | null, options: UseProductOptions = {}) {
  const { enabled = true } = options
  const [product, setProduct] = useState<ProductDTO | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchProduct = useCallback(async (productHandle: string) => {
    setIsLoading(true)
    setError(null)

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
        
        setProduct(enrichedProduct)
      } else {
        const errorMessage = response.error?.message || 'Producto no encontrado'
        setError(new Error(errorMessage))
        setProduct(null)
      }
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
 */
export async function fetchProductByHandle(handle: string): Promise<ProductDTO | null> {
  try {
    const response = await apiClient.get<ProductDTO>(
      API_ENDPOINTS.PRODUCTS.BY_HANDLE(handle)
    )

    if (response.success && response.data) {
      // Agregar propiedades de compatibilidad
      return {
        ...response.data,
        thumbnail: response.data.thumbnail ?? response.data.images?.[0] ?? undefined,
        price: response.data.price || 
          (response.data.variants?.length > 0 
            ? Math.min(...response.data.variants.map(v => v.tankuPrice))
            : undefined),
      }
    }
    
    return null
  } catch (error) {
    console.error('[fetchProductByHandle] Error:', error)
    throw error
  }
}

