/**
 * Hook para gestionar wishlists (wrapper del store global)
 */

'use client'

import { useWishlistsStore } from '@/lib/stores/wishlists-store'

export function useWishLists() {
  const wishLists = useWishlistsStore((s) => s.wishLists)
  const isLoading = useWishlistsStore((s) => s.isLoading)
  const error = useWishlistsStore((s) => s.error)
  const fetchWishLists = useWishlistsStore((s) => s.fetchWishLists)
  const ensureWishListsLoaded = useWishlistsStore((s) => s.ensureWishListsLoaded)
  const createWishList = useWishlistsStore((s) => s.createWishList)
  const updateWishList = useWishlistsStore((s) => s.updateWishList)
  const deleteWishList = useWishlistsStore((s) => s.deleteWishList)
  const addItemToWishList = useWishlistsStore((s) => s.addItemToWishList)
  const removeItemFromWishList = useWishlistsStore((s) => s.removeItemFromWishList)

  return {
    wishLists,
    isLoading,
    error,
    fetchWishLists: () => fetchWishLists({ force: true }),
    ensureWishListsLoaded,
    createWishList,
    updateWishList,
    deleteWishList,
    addItemToWishList,
    removeItemFromWishList,
  }
}
