'use client'

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

interface UseInfiniteScrollOptions {
  /** Contenedor con `overflow-y: auto` que hace scroll (obligatorio para IO correcto) */
  scrollRootRef: RefObject<HTMLElement | null>
  /** true cuando el nodo ya está montado (ref callback) */
  scrollRootReady: boolean
  /** true para usar viewport (window) como root de IntersectionObserver */
  useWindowRoot?: boolean
  hasMore: boolean
  isLoadingMore: boolean
  nextCursorToken: string | null
  onLoadMore: () => void | Promise<void>
  /** Margen inferior para disparar antes (px) */
  rootMargin?: string
  threshold?: number | number[]
}

/**
 * IntersectionObserver anclado al scroll root (no al viewport), con refs para evitar
 * closures obsoletas y dobles cargas.
 */
export function useInfiniteScroll({
  scrollRootRef,
  scrollRootReady,
  useWindowRoot = false,
  hasMore,
  isLoadingMore,
  nextCursorToken,
  onLoadMore,
  rootMargin = '0px 0px 320px 0px',
  threshold = 0,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadLockRef = useRef(false)
  const hasMoreRef = useRef(hasMore)
  const cursorRef = useRef(nextCursorToken)
  const loadingRef = useRef(isLoadingMore)
  const onLoadMoreRef = useRef(onLoadMore)

  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])
  useEffect(() => {
    cursorRef.current = nextCursorToken
  }, [nextCursorToken])
  useEffect(() => {
    loadingRef.current = isLoadingMore
  }, [isLoadingMore])
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useLayoutEffect(() => {
    if (!useWindowRoot && !scrollRootReady) return
    const root = scrollRootRef.current
    const sentinel = sentinelRef.current
    if ((!useWindowRoot && !root) || !sentinel) return
    if (!hasMore || !nextCursorToken) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (loadLockRef.current || loadingRef.current) continue
          if (!hasMoreRef.current || !cursorRef.current) continue

          loadLockRef.current = true
          const done = () => {
            window.setTimeout(() => {
              loadLockRef.current = false
            }, 350)
          }

          try {
            const p = onLoadMoreRef.current() as void | Promise<void>
            if (p && typeof (p as Promise<void>).then === 'function') {
              ;(p as Promise<void>).finally(done)
            } else {
              done()
            }
          } catch {
            done()
          }
        }
      },
      {
        root: useWindowRoot ? null : root,
        rootMargin,
        threshold,
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [scrollRootRef, scrollRootReady, useWindowRoot, hasMore, nextCursorToken, rootMargin, threshold])

  return { sentinelRef }
}
