'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Misma duración que `transition-[grid-template-rows]` del panel en wishlist cards */
const WISHLIST_PANEL_MS = 980

/**
 * Una sola wishlist expandida por lista; montaje del panel al abrir y desmontaje tras animación al cerrar.
 * Alineado con `MyWishlists`.
 */
export function useWishlistExpandList() {
  const [expandedWishlistId, setExpandedWishlistId] = useState<string | null>(null)
  const [mountedProductWishlistId, setMountedProductWishlistId] = useState<string | null>(null)
  /** Id DOM (`number`); evita conflicto `Timeout` (Node) vs `number` en el cliente */
  const closeUnmountTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (closeUnmountTimerRef.current) window.clearTimeout(closeUnmountTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (closeUnmountTimerRef.current) {
      window.clearTimeout(closeUnmountTimerRef.current)
      closeUnmountTimerRef.current = null
    }
    if (expandedWishlistId != null || !mountedProductWishlistId) {
      return
    }
    const idMounted = mountedProductWishlistId
    closeUnmountTimerRef.current = window.setTimeout(() => {
      setMountedProductWishlistId((prev) => (prev === idMounted ? null : prev))
      closeUnmountTimerRef.current = null
    }, WISHLIST_PANEL_MS)

    return () => {
      if (closeUnmountTimerRef.current) {
        window.clearTimeout(closeUnmountTimerRef.current)
        closeUnmountTimerRef.current = null
      }
    }
  }, [expandedWishlistId, mountedProductWishlistId])

  useEffect(() => {
    if (!expandedWishlistId) return
    setMountedProductWishlistId(expandedWishlistId)
  }, [expandedWishlistId])

  useEffect(() => {
    if (!expandedWishlistId) return
    const id = expandedWishlistId
    const run = () => {
      const el = document.getElementById(`wishlist-article-${id}`)
      const scrollRoot =
        document.getElementById('wishlist-scroll-root') ??
        document.getElementById('profile-public-scroll-root')
      if (!el || !scrollRoot) return
      const margin = 14
      const elRect = el.getBoundingClientRect()
      const rootRect = scrollRoot.getBoundingClientRect()
      if (elRect.top < rootRect.top + margin) {
        scrollRoot.scrollTop += elRect.top - rootRect.top - margin
      }
    }
    const t = window.setTimeout(run, 480)
    return () => window.clearTimeout(t)
  }, [expandedWishlistId])

  const toggleWishlistExpanded = (wishlistId: string) => {
    setExpandedWishlistId((prev) => {
      if (prev === wishlistId) return null
      setMountedProductWishlistId(wishlistId)
      return wishlistId
    })
  }

  /** Colapsar y limpiar (p. ej. al cambiar de usuario en listas agrupadas) */
  const resetExpandList = useCallback(() => {
    if (closeUnmountTimerRef.current) {
      window.clearTimeout(closeUnmountTimerRef.current)
      closeUnmountTimerRef.current = null
    }
    setExpandedWishlistId(null)
    setMountedProductWishlistId(null)
  }, [])

  return {
    expandedWishlistId,
    mountedProductWishlistId,
    toggleWishlistExpanded,
    resetExpandList,
  }
}
