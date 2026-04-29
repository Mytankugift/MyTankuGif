'use client'

import { useSyncExternalStore } from 'react'

/**
 * Caps de rejilla cuando solo mostramos 2 filas antes de «Ver más»
 * (alin. con wishlist-inline-products: 3→6, 4→8, 5→10, 6→12).
 */
function readWishlistTwoRowPx(): number {
  if (typeof window === 'undefined') return 6
  const w = window.innerWidth
  if (w >= 1024) return 12
  if (w >= 768) return 10
  if (w >= 640) return 8
  return 6
}

/** Carga «Ver más»: otras 2 filas al tamaño actual. */
export function useWishlistTwoRowCapacity(): number {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {}
      const mq = () => queueMicrotask(onStoreChange)
      window.addEventListener('resize', mq)
      return () => window.removeEventListener('resize', mq)
    },
    readWishlistTwoRowPx,
    () => 6,
  )
}

/** Para `useState` inicial (primer render cliente / SSR 6 items). */
export function getWishlistTwoRowCapacityPx(): number {
  return readWishlistTwoRowPx()
}
