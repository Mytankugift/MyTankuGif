/**
 * Superficies y tipografía compartidas entre checkout tipo carrito
 * y `/checkout/gift-direct` (vítreo sobre fondo `var(--color-surface-191e23-20)`).
 */
export const CHECKOUT_TANKU_SURFACE =
  'rounded-2xl border border-white/[0.08] bg-[#171B21]/55 p-5 sm:p-6 shadow-[0_2px_20px_rgba(0,0,0,0.12)] ring-1 ring-inset ring-white/[0.04] backdrop-blur-md'

/** Líneas de carrito: muy redondeado (pill suave) — selección añade solo borde, sin tinte de fondo. */
export const TANKU_CART_ITEM_SURFACE =
  'rounded-[2.5rem] border border-white/[0.08] bg-[#171B21]/55 p-3 sm:p-4 shadow-[0_2px_20px_rgba(0,0,0,0.12)] ring-1 ring-inset ring-white/[0.04] backdrop-blur-md'

export const CHECKOUT_TANKU_INPUT =
  'tanku-input-text-ios w-full rounded-xl border border-white/[0.1] bg-black/25 px-3 py-2.5 text-zinc-100 placeholder:text-zinc-500 shadow-inner backdrop-blur-sm focus:border-[#66DEDB]/45 focus:outline-none focus:ring-1 focus:ring-[#66DEDB]/20'

export const CHECKOUT_TANKU_SECTION_LABEL =
  'mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#66DEDB]'

/** Contenedor con scroll (mismo patrón que `#gift-direct-scroll-root` interno) */
export const CHECKOUT_TANKU_SCROLL_INNER =
  'min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain custom-scrollbar max-md:px-4 max-md:pt-[max(6.25rem,calc(env(safe-area-inset-top,0px)+5.25rem))] max-md:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:px-8 md:pb-16 md:pt-32'

export const CHECKOUT_TANKU_PAGE_BG = { backgroundColor: 'var(--color-surface-191e23-20)' } as const
