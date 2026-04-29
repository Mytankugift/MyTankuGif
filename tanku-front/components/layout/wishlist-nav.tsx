/**
 * Nav para /wishlist — mismos criterios que /profile (BaseNav + volver + título centrado en desktop).
 */

'use client'

import { BaseNav } from '@/components/layout/base-nav'
import { NavBackToFeedLink } from '@/components/layout/nav-back-to-feed'

export function WishlistNav() {
  return (
    <div className="pointer-events-none relative z-40 shrink-0 h-0 overflow-visible">
      <BaseNav
        showStories={false}
        canHide={false}
        isVisible={true}
        pageTitle="Wishlists"
        pageTitleColor="#FFFFFF"
        mobileBackCenterTitleCartOnly
        mobileTranslucentNav
        desktopNavTitleCentered
        startContent={<NavBackToFeedLink />}
        className="pointer-events-auto"
      />
    </div>
  )
}
