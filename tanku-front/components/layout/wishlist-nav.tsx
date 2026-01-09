/**
 * Nav para /wishlist
 * Incluye stories (si existen) y botones, pero NO se esconde
 */

'use client'

import { BaseNav } from './base-nav'

export function WishlistNav() {
  return <BaseNav showStories={true} canHide={false} isVisible={true} />
}

