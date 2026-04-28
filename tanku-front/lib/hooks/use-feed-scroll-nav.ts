'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

const APP_MAIN_ID = 'app-main'

function getMainScrollEl(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(APP_MAIN_ID)
}

/**
 * Con scroll "externo": el máximo entre `<main id="app-main">` y el documento.
 * En landing (y rutas con `main` en overflow visible) el desplazamiento puede ir en `window`, no en `main`.
 */
function readScrollTop(
  useOuterScroll: boolean,
  scrollRootEl: HTMLElement | null
): number {
  if (!useOuterScroll) return Math.max(0, scrollRootEl?.scrollTop ?? 0)
  const main = getMainScrollEl()
  const mainSt = main ? Math.max(0, main.scrollTop) : 0
  if (typeof window === 'undefined') return mainSt
  const winSt = Math.max(
    0,
    window.scrollY || document.documentElement.scrollTop || 0
  )
  return Math.max(mainSt, winSt)
}

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

/** Nav fijo: sin colapsar historias ni compactar buscador al hacer scroll (p. ej. /friends) */
export const FEED_NAV_SCROLL_NO_HIDE: FeedNavScrollState = {
  scrollTop: 0,
  showStoriesStrip: true,
  compactMid: false,
  minimalMode: false,
}

/**
 * Estado de scroll del feed para el navbar: dirección, histéresis y flags de UI.
 */
export function useFeedScrollNav(
  scrollRootRef: RefObject<HTMLElement | null>,
  /** true cuando el nodo ya está montado (p. ej. ref callback) */
  scrollRootAttached: boolean,
  /** true = scroll fuera de `#feed-scroll-root` (móvil: suele ser `#app-main`; landing: window) */
  useWindowScroll = false
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
    if (!useWindowScroll && !el) return
    if (ticking.current) return
    ticking.current = true
    requestAnimationFrame(() => {
      const st = readScrollTop(useWindowScroll, el)
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
  }, [scrollRootRef, useWindowScroll])

  useEffect(() => {
    // Scroll interno: esperar al nodo `#feed-scroll-root`. Scroll en `<main>` (móvil): no depende del ref.
    if (!useWindowScroll && (!scrollRootAttached || !scrollRootRef.current)) return

    const el = scrollRootRef.current
    lastY.current = readScrollTop(useWindowScroll, el)
    update()

    if (!useWindowScroll) {
      el?.addEventListener('scroll', update, { passive: true })
      return () => el?.removeEventListener('scroll', update)
    }

    const main = getMainScrollEl()
    const outerTarget: HTMLElement | Window = main ?? window
    outerTarget.addEventListener('scroll', update, { passive: true })
    return () => outerTarget.removeEventListener('scroll', update)
  }, [scrollRootRef, scrollRootAttached, update, useWindowScroll])

  return state
}
