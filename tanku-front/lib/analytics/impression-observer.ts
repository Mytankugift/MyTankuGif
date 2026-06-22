'use client'

/**
 * IntersectionObserver ÚNICO y compartido para impresiones (product_view, etc.).
 * Un solo observer para todo el feed en vez de uno por card: evita degradar el
 * render con 200-300 observers. Cada elemento dispara su callback UNA sola vez.
 * Ver _meta/tracking-eventos.md.
 */

type ImpressionCallback = () => void

const IMPRESSION_THRESHOLD = 0.5

let observer: IntersectionObserver | null = null
const callbacks = new WeakMap<Element, ImpressionCallback>()

function getObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return null
  }
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const cb = callbacks.get(entry.target)
          if (cb) {
            cb()
            // Una impresión por elemento: dejar de observar tras el primer disparo.
            observer?.unobserve(entry.target)
            callbacks.delete(entry.target)
          }
        }
      },
      { threshold: IMPRESSION_THRESHOLD },
    )
  }
  return observer
}

/** Observa un elemento y llama `onImpress` la primera vez que es ≥50% visible. */
export function observeImpression(el: Element, onImpress: ImpressionCallback): () => void {
  const obs = getObserver()
  if (!obs) return () => {}
  callbacks.set(el, onImpress)
  obs.observe(el)
  return () => {
    obs.unobserve(el)
    callbacks.delete(el)
  }
}
