'use client'

import { clsx } from 'clsx'
import Image from 'next/image'
import { GiftIcon, ChevronDownIcon, GlobeAltIcon, LockClosedIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { useIsMinWidth } from '@/lib/hooks/use-is-max-width'
import type { WishListDTO } from '@/types/api'

/** Chevron: solo icono — mismo criterio que Mis wishlists */
export const wishlistChevronExpandBtnCls =
  '-mr-0.5 shrink-0 inline-flex items-center justify-center border-0 bg-transparent p-0 text-zinc-300 shadow-none transition-[color,opacity] hover:bg-transparent hover:opacity-80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66DEDB]/35'

export interface WishlistAccordionCardProps {
  wishlist: WishListDTO
  expanded: boolean
  gridRowsOpen: boolean
  productsMounted: boolean
  onToggleExpand: () => void
  /** Pills escritorio (`lg`): Compartir, Acceso… o «Quitar wishlist». */
  desktopPills: React.ReactNode
  /**
   * Botón ⋯ móvil/tablet (`lg:hidden`). Si es `null`, no se muestra la columna ⋯.
   * Debe incluir `className` con `lg:hidden` (ver `WishlistAccordionEllipsisButton`).
   */
  mobileEllipsisButton: React.ReactNode | null
  /** Contenido del panel inferior (normalmente `<WishlistInlineProducts />`). */
  inlineProductsSlot: React.ReactNode
  /** Texto opcional bajo el nombre (p. ej. «De Ana» en listas guardadas). */
  subtitle?: string | null
  /**
   * Perfil ajeno: lista privada sin acceso (API sin ítems). Sin regalo, sin miniaturas ni chevron, no expandible.
   * Mostrar pills en todos los anchos (p. ej. Solicitar acceso en móvil sin depender del ⋯).
   */
  privateLockedVisitor?: boolean
}

export function WishlistAccordionCard({
  wishlist,
  expanded,
  gridRowsOpen,
  productsMounted,
  onToggleExpand,
  desktopPills,
  mobileEllipsisButton,
  inlineProductsSlot,
  subtitle,
  privateLockedVisitor = false,
}: WishlistAccordionCardProps) {
  const isLgWishlistThumbs = useIsMinWidth(1024)
  const thumbSlotCount = isLgWishlistThumbs ? 4 : 2

  const lockedPrivate = Boolean(privateLockedVisitor)

  return (
    <article
      id={`wishlist-article-${wishlist.id}`}
      className="overflow-hidden rounded-2xl border border-[#66DEDB]/25 bg-[#23262c]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-[#66DEDB]/45"
    >
      <div className="space-y-0 px-3 pb-4 pt-3 sm:px-5 sm:pt-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-3 md:flex-nowrap">
            <div
              role={lockedPrivate ? undefined : 'button'}
              tabIndex={lockedPrivate ? undefined : 0}
              aria-expanded={lockedPrivate ? undefined : expanded}
              aria-controls={lockedPrivate ? undefined : `wishlist-items-${wishlist.id}`}
              className={clsx(
                'group flex shrink-0 items-start gap-3 rounded-lg text-left outline-none sm:gap-4',
                !lockedPrivate &&
                  'cursor-pointer hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-[#66DEDB]/35',
                'md:min-h-[3.25rem] md:items-center',
                'md:max-w-[min(38vw,230px)]',
              )}
              onClick={lockedPrivate ? undefined : onToggleExpand}
              onKeyDown={
                lockedPrivate
                  ? undefined
                  : (e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      onToggleExpand()
                    }
              }
            >
              <div
                className={clsx(
                  'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-black/35 sm:h-14 sm:w-14',
                  lockedPrivate ? 'border-zinc-600/55' : 'border-[#73FFA2]/55',
                )}
                aria-hidden
              >
                {lockedPrivate ? (
                  <LockClosedIcon
                    className="h-6 w-6 text-zinc-500 sm:h-7 sm:w-7 md:h-8 md:w-8"
                    strokeWidth={1.65}
                  />
                ) : (
                  <GiftIcon
                    className="h-7 w-7 text-[#73FFA2] drop-shadow-[0_0_10px_rgba(115,255,162,0.5)] sm:h-9 sm:w-9 md:h-10 md:w-10"
                    strokeWidth={1.65}
                  />
                )}
              </div>
              <span
                className={clsx(
                  'min-w-0 flex-1 pt-1 text-[15px] font-semibold leading-tight text-[#66DEDB] md:truncate md:py-0 sm:text-base md:leading-snug md:break-normal md:pt-0',
                  subtitle ? '' : 'break-words',
                )}
              >
                <span className="block truncate md:truncate">{wishlist.name}</span>
                {subtitle ? (
                  <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">{subtitle}</span>
                ) : null}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-x-2 gap-y-2 max-md:flex-wrap md:flex-nowrap md:justify-start">
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-black/25 px-1.5 py-0.5 text-[11px] text-zinc-400 sm:text-xs">
                {wishlist.public ? (
                  <>
                    <GlobeAltIcon className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                    Pública
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                    Privada
                  </>
                )}
              </span>
              <span className="shrink-0 whitespace-nowrap text-[11px] text-zinc-500 sm:text-xs">
                {lockedPrivate
                  ? '—'
                  : `${wishlist.items.length} ${wishlist.items.length === 1 ? 'producto' : 'productos'}`}
              </span>
              <div
                className={clsx(
                  'min-w-0 shrink-0 items-center gap-2',
                  lockedPrivate
                    ? 'flex flex-wrap lg:flex-nowrap'
                    : 'hidden lg:flex lg:flex-nowrap',
                )}
              >
                {desktopPills}
              </div>
            </div>
          </div>

          {/* max-md ⋯ · md–lg menú ⋯ tablet · lg+: miniaturas + chevron — oculto si privada bloqueada */}
          {!lockedPrivate ? (
          <div
            className={clsx(
              'flex shrink-0 pt-1 md:pt-2',
              'max-md:flex-col max-md:items-end max-md:gap-1 max-md:self-start',
              'md:flex-row md:flex-row-reverse md:items-start md:gap-1.5',
            )}
          >
            {mobileEllipsisButton ? (
              <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5 lg:hidden">{mobileEllipsisButton}</div>
            ) : null}
            <div className={clsx('flex shrink-0 items-start gap-0.5 max-md:justify-end max-md:gap-0 md:justify-start md:gap-1.5')}>
              <div
                className={clsx(
                  'block shrink-0 overflow-hidden',
                  isLgWishlistThumbs ? 'h-11 w-[12.5rem] sm:h-[2.75rem]' : 'h-8 w-[4.25rem] md:h-[2.75rem] md:w-[5.875rem]',
                )}
                aria-hidden
              >
                <div
                  className={clsx(
                    'flex h-full items-center transition-[transform,opacity] duration-[900ms]',
                    isLgWishlistThumbs ? 'w-[12.5rem] gap-1.5' : 'w-[4.25rem] gap-1 md:w-[5.875rem] md:gap-1.5',
                    '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
                    '[will-change:transform,opacity]',
                    'motion-reduce:!transition-none',
                    expanded ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100',
                  )}
                >
                  {Array.from({ length: thumbSlotCount }).map((_, i) => {
                    const item = wishlist.items[i]
                    return (
                      <div
                        key={item?.id ?? `placeholder-${wishlist.id}-${i}`}
                        className={clsx(
                          'relative overflow-hidden rounded-md bg-zinc-800/90 ring-1 ring-white/10',
                          isLgWishlistThumbs ? 'h-9 w-9 sm:h-11 sm:w-11' : 'h-8 w-8 md:h-[2.75rem] md:w-[2.75rem]',
                        )}
                      >
                        {item?.product.thumbnail ? (
                          <Image
                            src={item.product.thumbnail}
                            alt=""
                            fill
                            className="object-cover"
                            sizes={isLgWishlistThumbs ? '44px' : '(max-width:767px) 32px, 44px'}
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/95">
                            <span className="text-[9px] text-zinc-600">—</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <button
                type="button"
                className={clsx(
                  wishlistChevronExpandBtnCls,
                  'mt-0.5 transition-transform duration-[950ms]',
                  'min-h-[2.25rem] min-w-[2.25rem] max-md:min-h-8 max-md:min-w-8',
                  '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
                )}
                aria-expanded={expanded}
                aria-controls={`wishlist-items-${wishlist.id}`}
                title={expanded ? 'Contraer' : 'Expandir'}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleExpand()
                }}
              >
                <ChevronDownIcon
                  className={clsx(
                    'h-5 w-5 transition-transform duration-[950ms] max-md:h-[1.125rem] max-md:w-[1.125rem] md:h-6 md:w-6',
                    '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
                    expanded ? 'rotate-180' : '',
                  )}
                  aria-hidden
                />
              </button>
            </div>
          </div>
          ) : null}
        </div>
      </div>

      {!lockedPrivate ? (
      <div
        id={`wishlist-items-${wishlist.id}`}
        className={clsx(
          'grid overflow-hidden border-t transition-[grid-template-rows] duration-[980ms]',
          '[transition-timing-function:cubic-bezier(0.33,1,0.32,1)]',
          'motion-reduce:!duration-150 motion-reduce:[transition-timing-function:ease]',
          '[will-change:grid-template-rows]',
          gridRowsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          gridRowsOpen ? 'border-[#66DEDB]/20' : 'border-transparent',
        )}
      >
        <div className="min-h-0 overflow-hidden">{productsMounted ? inlineProductsSlot : null}</div>
      </div>
      ) : (
        <div className="border-t border-[#66DEDB]/15 bg-black/15 px-3 py-6 text-center text-sm text-zinc-500 sm:px-4">
          {inlineProductsSlot}
        </div>
      )}
    </article>
  )
}

/** Botón ⋯ estándar; debe usarse dentro de `.lg:hidden`. */
export function WishlistAccordionEllipsisButton({
  'aria-expanded': ariaExpanded,
  onClick,
}: {
  'aria-expanded'?: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={ariaExpanded ?? false}
      aria-label="Más opciones de la wishlist"
      onClick={onClick}
      className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-1 text-[#66DEDB] shadow-none transition-colors hover:bg-white/[0.07] hover:text-[#73FFA2] md:h-10 md:w-10 md:p-1.5 lg:hidden"
    >
      <EllipsisHorizontalIcon className="h-5 w-5 md:h-6 md:w-6" aria-hidden />
    </button>
  )
}
