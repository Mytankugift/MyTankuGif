/**
 * Hook para gestionar wishlists
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { WishListDTO } from '@/types/api'
import { useAuthStore } from '@/lib/stores/auth-store'

interface UseWishListsResult {
  // Estado
  wishLists: WishListDTO[]
  isLoading: boolean
  error: string | null

  // Acciones
  fetchWishLists: () => Promise<void>
  createWishList: (name: string, isPublic?: boolean) => Promise<WishListDTO | null>
  updateWishList: (id: string, name?: string, isPublic?: boolean) => Promise<WishListDTO | null>
  deleteWishList: (id: string) => Promise<void>
  addItemToWishList: (wishListId: string, productId: string, variantId?: string) => Promise<void>
  removeItemFromWishList: (wishListId: string, itemId: string) => Promise<void>
}

export function useWishLists(): UseWishListsResult {
  const { isAuthenticated, user } = useAuthStore()
  const [wishLists, setWishLists] = useState<WishListDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Obtener lista de wishlists
   */
  const fetchWishLists = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setWishLists([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<WishListDTO[]>(API_ENDPOINTS.WISHLISTS.LIST)
      if (response.success && response.data) {
        setWishLists(response.data)
      } else {
        setError(response.error?.message || 'Error al obtener wishlists')
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener wishlists')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  /**
   * Crear wishlist
   */
  const createWishList = useCallback(
    async (name: string, isPublic: boolean = false): Promise<WishListDTO | null> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.post<WishListDTO>(API_ENDPOINTS.WISHLISTS.CREATE, {
          name,
          public: isPublic,
        })

        if (response.success && response.data) {
          // Actualizar lista local
          setWishLists((prev) => [response.data!, ...prev])
          return response.data
        } else {
          setError(response.error?.message || 'Error al crear wishlist')
          return null
        }
      } catch (err: any) {
        setError(err.message || 'Error al crear wishlist')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  /**
   * Actualizar wishlist
   */
  const updateWishList = useCallback(
    async (
      id: string,
      name?: string,
      isPublic?: boolean
    ): Promise<WishListDTO | null> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const updateData: { name?: string; public?: boolean } = {}
        if (name !== undefined) updateData.name = name
        if (isPublic !== undefined) updateData.public = isPublic

        const response = await apiClient.put<WishListDTO>(
          API_ENDPOINTS.WISHLISTS.UPDATE(id),
          updateData
        )

        if (response.success && response.data) {
          // Actualizar lista local
          setWishLists((prev) =>
            prev.map((list) => (list.id === id ? response.data! : list))
          )
          return response.data
        } else {
          setError(response.error?.message || 'Error al actualizar wishlist')
          return null
        }
      } catch (err: any) {
        setError(err.message || 'Error al actualizar wishlist')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  /**
   * Eliminar wishlist
   */
  const deleteWishList = useCallback(
    async (id: string): Promise<void> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.delete(API_ENDPOINTS.WISHLISTS.DELETE(id))

        if (response.success) {
          // Actualización optimista: remover inmediatamente
          setWishLists((prev) => prev.filter((list) => list.id !== id))
        } else {
          setError(response.error?.message || 'Error al eliminar wishlist')
        }
      } catch (err: any) {
        setError(err.message || 'Error al eliminar wishlist')
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  /**
   * Agregar producto a wishlist
   */
  const addItemToWishList = useCallback(
    async (wishListId: string, productId: string, variantId?: string): Promise<void> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.post(
          API_ENDPOINTS.WISHLISTS.ADD_ITEM(wishListId),
          { productId, variantId }
        )

        if (response.success) {
          // Refrescar wishlists para obtener los items actualizados
          await fetchWishLists()
        } else {
          setError(response.error?.message || 'Error al agregar producto a wishlist')
        }
      } catch (err: any) {
        setError(err.message || 'Error al agregar producto a wishlist')
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id, fetchWishLists]
  )

  /**
   * Remover producto de wishlist
   */
  const removeItemFromWishList = useCallback(
    async (wishListId: string, itemId: string): Promise<void> => {
      if (!isAuthenticated || !user?.id) {
        setError('No autenticado')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.delete(
          API_ENDPOINTS.WISHLISTS.REMOVE_ITEM(wishListId, itemId)
        )

        if (response.success) {
          // Actualización optimista: remover item de la lista local
          setWishLists((prev) =>
            prev.map((list) =>
              list.id === wishListId
                ? {
                    ...list,
                    items: list.items.filter((item) => item.id !== itemId),
                  }
                : list
            )
          )
        } else {
          setError(response.error?.message || 'Error al remover producto de wishlist')
          // Si falla, refrescar para restaurar estado
          await fetchWishLists()
        }
      } catch (err: any) {
        setError(err.message || 'Error al remover producto de wishlist')
        // Si falla, refrescar para restaurar estado
        await fetchWishLists()
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id, fetchWishLists]
  )

  return {
    wishLists,
    isLoading,
    error,
    fetchWishLists,
    createWishList,
    updateWishList,
    deleteWishList,
    addItemToWishList,
    removeItemFromWishList,
  }
}

