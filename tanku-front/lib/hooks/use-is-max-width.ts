'use client'

import { useSyncExternalStore } from 'react'

/** Alineado a breakpoints Tailwind: `767` equivale a `max-md`. */
export function useIsMaxWidth(maxWidthPx: number): boolean {
  const mq = `(max-width: ${maxWidthPx}px)`
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {}
      const m = window.matchMedia(mq)
      m.addEventListener('change', onStoreChange)
      return () => m.removeEventListener('change', onStoreChange)
    },
    () => (typeof window !== 'undefined' ? window.matchMedia(mq).matches : false),
    () => false,
  )
}

/** Alineado a breakpoints Tailwind: `1024` equivale a `lg`. */
export function useIsMinWidth(minWidthPx: number): boolean {
  const mq = `(min-width: ${minWidthPx}px)`
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {}
      const m = window.matchMedia(mq)
      m.addEventListener('change', onStoreChange)
      return () => m.removeEventListener('change', onStoreChange)
    },
    () => (typeof window !== 'undefined' ? window.matchMedia(mq).matches : false),
    () => false,
  )
}
