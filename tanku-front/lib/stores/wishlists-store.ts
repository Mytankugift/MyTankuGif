/**
 * Store global de wishlists (Zustand)
 * Una sola fuente de verdad compartida entre cards, modales y /wishlist
 */

import { create } from 'zustand'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { WishListDTO } from '@/types/api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { track } from '@/lib/analytics/tracker'

export function isProductInWishList(
  wishLists: WishListDTO[],
  wishListId: string,
  productId: string,
): boolean {
  const list = wishLists.find((w) => w.id === wishListId)
  return list?.items?.some((item) => item.product?.id === productId || item.productId === productId) ?? false
}

export function isProductInAnyWishList(wishLists: WishListDTO[], productId: string): boolean {
  return wishLists.some((list) =>
    list.items?.some((item) => item.product?.id === productId || item.productId === productId),
  )
}

export function isWishlistDuplicateError(err: unknown): boolean {
  const message =
    (err as { message?: string })?.message ||
    (err as { error?: { message?: string } })?.error?.message ||
    ''
  const code = (err as { error?: { code?: string } })?.error?.code
  return (
    code === 'CONFLICT' ||
    message.toLowerCase().includes('ya está en esta wish list') ||
    message.toLowerCase().includes('ya esta en esta wish list')
  )
}

interface WishListsState {
  wishLists: WishListDTO[]
  isLoading: boolean
  hasLoaded: boolean
  error: string | null

  fetchWishLists: (options?: { force?: boolean }) => Promise<void>
  ensureWishListsLoaded: () => Promise<void>
  createWishList: (name: string, isPublic?: boolean) => Promise<WishListDTO | null>
  updateWishList: (id: string, name?: string, isPublic?: boolean) => Promise<WishListDTO | null>
  deleteWishList: (id: string) => Promise<void>
  addItemToWishList: (
    wishListId: string,
    productId: string,
    variantId?: string,
  ) => Promise<'added' | 'already_exists'>
  removeItemFromWishList: (wishListId: string, itemId: string) => Promise<void>
  reset: () => void
}

export const useWishlistsStore = create<WishListsState>((set, get) => ({
  wishLists: [],
  isLoading: false,
  hasLoaded: false,
  error: null,

  fetchWishLists: async (options) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      set({ wishLists: [], hasLoaded: false, error: null })
      return
    }

    if (get().isLoading) return
    if (get().hasLoaded && !options?.force) return

    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.get<WishListDTO[]>(API_ENDPOINTS.WISHLISTS.LIST)
      if (response.success && response.data) {
        set({ wishLists: response.data, hasLoaded: true })
      } else {
        set({ error: response.error?.message || 'Error al obtener wishlists' })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al obtener wishlists'
      set({ error: message })
    } finally {
      set({ isLoading: false })
    }
  },

  ensureWishListsLoaded: async () => {
    if (get().hasLoaded) return
    await get().fetchWishLists({ force: true })
  },

  createWishList: async (name, isPublic = false) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) return null

    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post<WishListDTO>(API_ENDPOINTS.WISHLISTS.CREATE, {
        name,
        public: isPublic,
      })
      if (response.success && response.data) {
        set((state) => ({
          wishLists: [response.data!, ...state.wishLists],
          hasLoaded: true,
        }))
        return response.data
      }
      set({ error: response.error?.message || 'Error al crear wishlist' })
      return null
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear wishlist'
      set({ error: message })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  updateWishList: async (id, name, isPublic) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) return null

    set({ isLoading: true, error: null })
    try {
      const updateData: { name?: string; public?: boolean } = {}
      if (name !== undefined) updateData.name = name
      if (isPublic !== undefined) updateData.public = isPublic

      const response = await apiClient.put<WishListDTO>(API_ENDPOINTS.WISHLISTS.UPDATE(id), updateData)
      if (response.success && response.data) {
        set((state) => ({
          wishLists: state.wishLists.map((list) => (list.id === id ? response.data! : list)),
        }))
        return response.data
      }
      set({ error: response.error?.message || 'Error al actualizar wishlist' })
      return null
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar wishlist'
      set({ error: message })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  deleteWishList: async (id) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) return

    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.delete(API_ENDPOINTS.WISHLISTS.DELETE(id))
      if (response.success) {
        set((state) => ({
          wishLists: state.wishLists.filter((list) => list.id !== id),
        }))
      } else {
        set({ error: response.error?.message || 'Error al eliminar wishlist' })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar wishlist'
      set({ error: message })
    } finally {
      set({ isLoading: false })
    }
  },

  addItemToWishList: async (wishListId, productId, variantId) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) {
      throw new Error('No autenticado')
    }

    if (isProductInWishList(get().wishLists, wishListId, productId)) {
      return 'already_exists'
    }

    set({ error: null })

    try {
      const response = await apiClient.post<{
        id: string
        productId: string
        variantId?: string | null
        createdAt: string
        product?: { id: string; title: string; handle: string; thumbnail: string | null }
      }>(API_ENDPOINTS.WISHLISTS.ADD_ITEM(wishListId), { productId, variantId })

      if (response.success && response.data) {
        const item = response.data
        set((state) => ({
          wishLists: state.wishLists.map((list) =>
            list.id === wishListId
              ? {
                  ...list,
                  items: [
                    ...list.items,
                    {
                      id: item.id,
                      productId: item.productId,
                      variantId: item.variantId ?? variantId ?? null,
                      product: item.product ?? {
                        id: productId,
                        title: '',
                        handle: '',
                        thumbnail: null,
                      },
                      createdAt: item.createdAt,
                    },
                  ],
                }
              : list,
          ),
        }))
        track('wishlist_add', {
          entityType: 'product',
          entityId: productId,
          metadata: { wishListId, variantId },
        })
        return 'added'
      }

      const errorMessage = response.error?.message || 'Error al agregar producto a wishlist'
      if (
        response.error?.code === 'CONFLICT' ||
        errorMessage.toLowerCase().includes('ya está en esta wish list')
      ) {
        return 'already_exists'
      }
      throw new Error(errorMessage)
    } catch (err: unknown) {
      if (isWishlistDuplicateError(err)) {
        return 'already_exists'
      }
      throw err
    }
  },

  removeItemFromWishList: async (wishListId, itemId) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || !user?.id) return

    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.delete(API_ENDPOINTS.WISHLISTS.REMOVE_ITEM(wishListId, itemId))
      if (response.success) {
        set((state) => ({
          wishLists: state.wishLists.map((list) =>
            list.id === wishListId
              ? { ...list, items: list.items.filter((item) => item.id !== itemId) }
              : list,
          ),
        }))
      } else {
        set({ error: response.error?.message || 'Error al remover producto de wishlist' })
        await get().fetchWishLists({ force: true })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al remover producto de wishlist'
      set({ error: message })
      await get().fetchWishLists({ force: true })
    } finally {
      set({ isLoading: false })
    }
  },

  reset: () => {
    set({ wishLists: [], isLoading: false, hasLoaded: false, error: null })
  },
}))
