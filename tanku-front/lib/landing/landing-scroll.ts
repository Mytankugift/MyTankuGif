const LANDING_NAV_HEIGHT_KEY = 'tanku-landing-nav-height-v1'

export function readStoredLandingNavHeight(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(LANDING_NAV_HEIGHT_KEY)
    if (!raw) return null
    const n = parseFloat(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function persistLandingNavHeight(px: number) {
  if (typeof window === 'undefined' || px <= 0) return
  try {
    sessionStorage.setItem(LANDING_NAV_HEIGHT_KEY, String(px))
  } catch {
    /* ignore */
  }
}

/** Reserva mínima del spacer bajo el nav fijo (antes de medir en vivo). */
export function landingTopReserveFallbackPx(viewportW: number): number {
  // Móvil: logo 70px + eslogán + botón + buscador + paddings (~190–210px real).
  if (viewportW < 768) return 200
  if (viewportW < 1024) return 132
  return 116
}

/** Landing scrollea en `window` y a veces en `#app-main`; resetear ambos. */
export function resetLandingScroll() {
  if (typeof window === 'undefined') return
  const top = 0
  window.scrollTo(top, top)
  document.documentElement.scrollTop = top
  document.body.scrollTop = top
  document.getElementById('app-main')?.scrollTo({ top, left: 0, behavior: 'auto' })
}

export function lockLandingScrollRestoration() {
  if (typeof window === 'undefined' || !('scrollRestoration' in history)) return () => {}
  const prev = history.scrollRestoration
  history.scrollRestoration = 'manual'
  return () => {
    history.scrollRestoration = prev
  }
}
