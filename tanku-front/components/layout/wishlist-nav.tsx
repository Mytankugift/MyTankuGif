/**
 * Nav para /wishlist
 * Incluye stories (si existen) y botones, pero NO se esconde
 */

'use client'

import { BaseNav } from './base-nav'
import { useStories } from '@/lib/hooks/use-stories'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useEffect } from 'react'

export function WishlistNav() {
  const { wishlistStories, fetchWishlistStories } = useStories()
  const { user } = useAuthStore()

  // Cargar historias de wishlist
  useEffect(() => {
    if (user?.id) {
      fetchWishlistStories(user.id)
    }
  }, [user?.id, fetchWishlistStories])

  return (
    <BaseNav 
      showStories={true} 
      canHide={false} 
      isVisible={true}
      customStories={wishlistStories}
    />
  )
}

