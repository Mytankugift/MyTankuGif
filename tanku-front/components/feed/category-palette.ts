/**
 * Categorías feed — opción A: superficie neutra minimalista.
 */
export const CATEGORY_PALETTE_RGB = [
  [139, 92, 246],
  [59, 130, 246],
  [255, 107, 107],
  [249, 115, 22],
  [236, 72, 153],
  [99, 102, 241],
] as const

export const CATEGORY_CHIP_BG = '#262626'
export const CATEGORY_CHIP_BG_HOVER = '#2E2E2E'
export const CATEGORY_CHIP_BG_SELECTED = 'rgba(115, 255, 162, 0.08)'
export const CATEGORY_CHIP_BORDER = 'rgba(255, 255, 255, 0.08)'
export const CATEGORY_CHIP_BORDER_SELECTED = '#73FFA2'
export const CATEGORY_CHIP_TEXT_SELECTED = '#73FFA2'

/** Chip inactivo: fondo neutro + hover sutil */
export const CATEGORY_CHIP_IDLE_CLASS =
  'border-white/[0.08] bg-[#262626] hover:bg-[#2E2E2E]'

/** Casilla del modal de categorías (misma superficie que inputs en modales Tanku) */
export const CATEGORY_TILE_IDLE_CLASS =
  'border-[#414141] bg-black/25 transition-[border-color,background-color,box-shadow,transform] duration-200 active:scale-[0.97] md:hover:-translate-y-0.5 md:hover:border-[#66DEDB]/55 md:hover:bg-[#73FFA2]/[0.07] md:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35),0_0_0_1px_rgba(102,222,219,0.18)]'

/** Chip activo / seleccionado (fondo suave) */
export const CATEGORY_CHIP_SELECTED_CLASS =
  'border-[#73FFA2] bg-[#73FFA2]/[0.08]'

/** Chip activo con fondo sólido (badge móvil, barra) */
export const CATEGORY_CHIP_SELECTED_SOLID_CLASS =
  'border-[#73FFA2] bg-[#262626]'

export const CATEGORY_CHIP_TEXT_IDLE_CLASS = 'text-white/85'
export const CATEGORY_CHIP_TEXT_SELECTED_CLASS = 'text-[#73FFA2]'

export function categoryChipBackground(selected = false): string {
  return selected ? CATEGORY_CHIP_BG_SELECTED : CATEGORY_CHIP_BG
}

export function categoryChipBorder(selected = false): string {
  return selected ? CATEGORY_CHIP_BORDER_SELECTED : CATEGORY_CHIP_BORDER
}

/** Contenedor cuadrado del icono (sin recorte circular ni fondo) */
export const CATEGORY_ICON_SHELL_CLASS =
  'relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px] p-0.5 sm:h-8 sm:w-8 sm:rounded-[8px] sm:p-1'

export const CATEGORY_ICON_IMAGE_CLASS = 'h-full w-full object-contain'

/** Columna izquierda del chip — un poco más ancha para el cuadrado */
export const CATEGORY_ICON_COL_CLASS = 'flex w-11 shrink-0 items-center justify-center self-stretch px-1 sm:w-12'

const OPACITY_BORDER = 0.3

export function categoryPaletteIndex(id: string | number, name?: string, salt = 0): number {
  const s = `${id}:${name ?? ''}:${salt}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 9973
  return h % CATEGORY_PALETTE_RGB.length
}

export function categoryBorder(index: number): string {
  const [r, g, b] = CATEGORY_PALETTE_RGB[index % CATEGORY_PALETTE_RGB.length]
  return `rgba(${r}, ${g}, ${b}, ${OPACITY_BORDER})`
}

/** @deprecated Usar categoryChipBorder() */
export function categoryBorderFallback(): string {
  return CATEGORY_CHIP_BORDER
}

/** Altura común: botón Categorías, flechas y chips del carrusel */
export const CATEGORY_SLIDER_ROW_H = 'h-9 min-h-[2.25rem] sm:h-10 sm:min-h-[2.5rem]'

/** Ancho mínimo del bloque de nombre en el carrusel */
export const CATEGORY_NAME_MIN_W = 'min-w-[5.25rem] sm:min-w-[6.25rem]'

