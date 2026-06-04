import { clsx } from 'clsx'

/** Estilo de acción de modales Tanku (publicación, pedidos, soporte). */
export const tankuModalBtnBase =
  'inline-flex items-center justify-center rounded-[25px] font-semibold transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)]'

/** Tamaño compacto (footer de pedido, soporte). */
export const tankuModalBtnSizeCompact = 'px-2.5 py-1.5 text-[11px] leading-none'

/** Tamaño estándar en modales (publicar, cancelar). */
export const tankuModalBtnSizeDefault = 'px-3 py-2 text-[11px] leading-none sm:text-xs'

export const tankuModalBtnPrimaryClass = 'bg-[#73FFA2] text-[#262626]'

export const tankuModalBtnSecondaryClass =
  'border-2 border-[#73FFA2] bg-[#262626] text-[#F4F4F4]'

/** Borde y texto azul Tanku (#66DEDB) sobre fondo oscuro. */
export const tankuModalBtnAccentClass =
  'border-2 border-[#66DEDB] bg-[#66DEDB]/10 text-[#66DEDB]'

const variantClass = {
  primary: tankuModalBtnPrimaryClass,
  secondary: tankuModalBtnSecondaryClass,
  accent: tankuModalBtnAccentClass,
} as const

export type TankuModalBtnVariant = keyof typeof variantClass

export function tankuModalBtnClass(
  variant: TankuModalBtnVariant,
  size: 'compact' | 'default' = 'compact',
  className?: string,
) {
  return clsx(
    tankuModalBtnBase,
    size === 'compact' ? tankuModalBtnSizeCompact : tankuModalBtnSizeDefault,
    variantClass[variant],
    className,
  )
}
