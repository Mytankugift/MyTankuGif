'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useWishlistsStore } from '@/lib/stores/wishlists-store'

/** Precarga wishlists una vez al iniciar sesión (cache compartido para cards y selector). */
export function useWishlistsInit() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userId = useAuthStore((s) => s.user?.id)
  const ensureWishListsLoaded = useWishlistsStore((s) => s.ensureWishListsLoaded)
  const reset = useWishlistsStore((s) => s.reset)

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      reset()
      return
    }
    ensureWishListsLoaded()
  }, [isAuthenticated, userId, ensureWishListsLoaded, reset])
}
