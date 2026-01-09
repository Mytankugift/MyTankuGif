'use client'

import { useEffect, useRef } from 'react'

interface UseInfiniteScrollOptions {
  hasMore: boolean
  isLoading: boolean
  nextCursorToken: string | null
  onLoadMore: () => void
  rootMargin?: string
  threshold?: number
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  nextCursorToken,
  onLoadMore,
  rootMargin = '100px',
  threshold = 0.1,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false)

  useEffect(() => {
    // Solo crear observer si hay más contenido Y hay cursor token
    if (!hasMore || !nextCursorToken || isLoading) {
      return
    }

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const scrollContainer = document.querySelector('.custom-scrollbar') as HTMLElement

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoadingRef.current && hasMore && nextCursorToken) {
            isLoadingRef.current = true
            onLoadMore()
            
            // Resetear flag después de un delay
            setTimeout(() => {
              isLoadingRef.current = false
            }, 2000)
          }
        })
      },
      {
        threshold,
        rootMargin,
        root: scrollContainer || null,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, isLoading, nextCursorToken, onLoadMore, rootMargin, threshold])

  return { sentinelRef }
}

