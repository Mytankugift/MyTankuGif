'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/** Historias solo con el scroll arriba del todo */
const STORIES_TOP_EPS = 3
/** Entrar en modo minimal (ocultar categorías) al bajar */
const DEEP_ENTER = 200
/** Delta mínimo hacia arriba para salir del minimal desde cualquier scrollY */
const SCROLL_UP_DELTA = 6

export type FeedNavScrollState = {
  scrollTop: number
  showStoriesStrip: boolean
  /** Entre leve y profundo: buscador + categorías más compactos */
  compactMid: boolean
  /** Scroll profundo: ocultar solo el selector/listado de categorías; buscador y eslogan visibles */
  minimalMode: boolean
}

/**
 * Estado de scroll del feed para el navbar: dirección, histéresis y flags de UI.
 */
export function useFeedScrollNav(
  scrollRootRef: RefObject<HTMLElement | null>,
  /** true cuando el nodo ya está montado (p. ej. ref callback) */
  scrollRootAttached: boolean
): FeedNavScrollState {
  const [state, setState] = useState<FeedNavScrollState>({
    scrollTop: 0,
    showStoriesStrip: true,
    compactMid: false,
    minimalMode: false,
  })

  const lastY = useRef(0)
  const minimalLocked = useRef(false)
  const ticking = useRef(false)

  const update = useCallback(() => {
    const el = scrollRootRef.current
    if (!el || ticking.current) return
    ticking.current = true
    requestAnimationFrame(() => {
      const st = Math.max(0, el.scrollTop)
      const delta = st - lastY.current
      const goingDown = delta > 0
      lastY.current = st

      if (st <= STORIES_TOP_EPS) {
        minimalLocked.current = false
      } else if (delta < -SCROLL_UP_DELTA) {
        // Subir el scroll desde cualquier posición → volver a mostrar categorías
        minimalLocked.current = false
      } else if (goingDown && st >= DEEP_ENTER) {
        minimalLocked.current = true
      }

      const showStories = st <= STORIES_TOP_EPS
      const minimal = minimalLocked.current
      /** Scroll leve: sin historias pero aún no “minimal” → buscador/categorías más compactos */
      const compactMid = st > STORIES_TOP_EPS && !minimal

      setState({
        scrollTop: st,
        showStoriesStrip: showStories,
        compactMid,
        minimalMode: minimal,
      })
      ticking.current = false
    })
  }, [scrollRootRef])

  useEffect(() => {
    if (!scrollRootAttached) return
    const el = scrollRootRef.current
    if (!el) return

    lastY.current = el.scrollTop
    update()

    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  }, [scrollRootRef, scrollRootAttached, update])

  return state
}
