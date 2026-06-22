'use client'

import { RefObject, useEffect } from 'react'
import { observeImpression } from './impression-observer'

/**
 * Conecta un `ref` al IntersectionObserver compartido y llama `onImpress` una
 * sola vez cuando el elemento entra en viewport. `onImpress` debe ser estable
 * (envolver en useCallback) para no re-observar en cada render.
 */
export function useImpression(
  ref: RefObject<Element | null>,
  onImpress: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    return observeImpression(el, onImpress)
  }, [ref, onImpress, enabled])
}
