/**
 * Estilos neutros de categorías (slider, selector, pastilla).
 * Los iconos subidos ya traen color; el chip solo aporta fondo/borde discretos.
 */
export const CATEGORY_PALETTE_RGB = [
  [139, 92, 246],
  [59, 130, 246],
  [255, 107, 107],
  [249, 115, 22],
  [236, 72, 153],
  [99, 102, 241],
] as const

const NEUTRAL_FILL_LEFT = 'rgba(255, 255, 255, 0.06)'
const NEUTRAL_FILL_RIGHT = 'rgba(255, 255, 255, 0.04)'
const NEUTRAL_BORDER = 'rgba(255, 255, 255, 0.14)'
const NEUTRAL_FILL_LEFT_COMPACT = 'rgba(25, 30, 35, 0.96)'
const NEUTRAL_FILL_RIGHT_COMPACT = 'rgba(25, 30, 35, 0.9)'

export function categoryFillLeft(_index: number): string {
  return NEUTRAL_FILL_LEFT
}

export function categoryFillRight(_index: number): string {
  return NEUTRAL_FILL_RIGHT
}

export function categoryFillLeftCompact(_index: number): string {
  return NEUTRAL_FILL_LEFT_COMPACT
}

export function categoryFillRightCompact(_index: number): string {
  return NEUTRAL_FILL_RIGHT_COMPACT
}

export function categoryBorder(_index: number): string {
  return NEUTRAL_BORDER
}

/** Altura común: botón Categorías, flechas y chips del carrusel */
export const CATEGORY_SLIDER_ROW_H = 'h-9 min-h-[2.25rem] sm:h-10 sm:min-h-[2.5rem]'
