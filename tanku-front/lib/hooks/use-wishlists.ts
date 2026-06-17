/**
 * Hook para gestionar wishlists (wrapper del store global)
 */

'use client'

import { useCallback } from 'react'
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

  // ✅ Estable: sin esto, el wrapper se recreaba en cada render y los consumidores
  // que lo ponen en deps de useEffect (wishlist-viewer, my-wishlists) entraban en
  // bucle infinito de /wishlists.
  const fetchWishListsForced = useCallback(
    () => fetchWishLists({ force: true }),
    [fetchWishLists],
  )

  return {
    wishLists,
    isLoading,
    error,
    fetchWishLists: fetchWishListsForced,
    ensureWishListsLoaded,
    createWishList,
    updateWishList,
    deleteWishList,
    addItemToWishList,
    removeItemFromWishList,
  }
}
