/**
 * Nav para /wishlist
 */

'use client'

import { BaseNav } from './base-nav'

export function WishlistNav() {
  return (
    <BaseNav
      showStories={false}
      canHide={false}
      isVisible={true}
      pageTitle="Wishlists"
      pageSubtitle="Gestiona tus wishlists y descubre las de tus amigos"
      pageTitleColor="#66DEDB"
    />
  )
}

