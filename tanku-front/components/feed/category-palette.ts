/**
 * Colores base de categorías (slider + selector). Misma secuencia en ambos sitios.
 *
 * Confirmación de opacidades:
 * - Lado izquierdo (imagen / avatar): **35 %**
 * - Lado derecho (nombre): **20 %**
 * - Borde: 1 px, mismo RGB con **26 %** (trazo mínimo, alineado al tono del fill; selección sigue usando #73FFA2)
 */
export const CATEGORY_PALETTE_RGB = [
  [139, 92, 246],
  [59, 130, 246],
  [255, 107, 107],
  [249, 115, 22],
  [236, 72, 153],
  [99, 102, 241],
] as const

const OPACITY_LEFT = 0.35
const OPACITY_RIGHT = 0.2
/** Pastilla activa flotante (móvil): más opaco para leer sobre el contenido del feed */
const OPACITY_LEFT_COMPACT_PILL = 0.78
const OPACITY_RIGHT_COMPACT_PILL = 0.7
/** Borde fino, mismo tono; ~entre 20 % y 35 % para que se note poco */
const OPACITY_BORDER = 0.26

export function categoryFillLeft(index: number): string {
  const [r, g, b] = CATEGORY_PALETTE_RGB[index % CATEGORY_PALETTE_RGB.length]
  return `rgba(${r}, ${g}, ${b}, ${OPACITY_LEFT})`
}

export function categoryFillRight(index: number): string {
  const [r, g, b] = CATEGORY_PALETTE_RGB[index % CATEGORY_PALETTE_RGB.length]
  return `rgba(${r}, ${g}, ${b}, ${OPACITY_RIGHT})`
}

export function categoryFillLeftCompact(index: number): string {
  const [r, g, b] = CATEGORY_PALETTE_RGB[index % CATEGORY_PALETTE_RGB.length]
  return `rgba(${r}, ${g}, ${b}, ${OPACITY_LEFT_COMPACT_PILL})`
}

export function categoryFillRightCompact(index: number): string {
  const [r, g, b] = CATEGORY_PALETTE_RGB[index % CATEGORY_PALETTE_RGB.length]
  return `rgba(${r}, ${g}, ${b}, ${OPACITY_RIGHT_COMPACT_PILL})`
}

export function categoryBorder(index: number): string {
  const [r, g, b] = CATEGORY_PALETTE_RGB[index % CATEGORY_PALETTE_RGB.length]
  return `rgba(${r}, ${g}, ${b}, ${OPACITY_BORDER})`
}

/** Altura común: botón Categorías, flechas y chips del carrusel */
export const CATEGORY_SLIDER_ROW_H = 'h-9 min-h-[2.25rem] sm:h-10 sm:min-h-[2.5rem]'
