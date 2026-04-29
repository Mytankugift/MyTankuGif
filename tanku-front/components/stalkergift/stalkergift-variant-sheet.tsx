'use client'

import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { ProductDTO } from '@/types/api'

type Variant = NonNullable<ProductDTO['variants']>[number]

export function StalkerGiftVariantSheet({
  open,
  variants,
  selectedId,
  onClose,
  onSelect,
  formatPrice,
}: {
  open: boolean
  variants: Variant[]
  selectedId: string | null
  onClose: () => void
  onSelect: (variantId: string) => void
  formatPrice: (n: number) => string
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[2000010] flex min-h-0 items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 sm:py-5 md:p-6"
      role="presentation"
    >
      {/* Móvil/tablet: oscuro sutil; escritorio: sin tinte detrás del panel */}
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-black/55 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className="relative z-[1] mx-auto flex max-h-[min(82dvh,34rem)] w-full max-w-md flex-col rounded-[1.35rem] border border-white/10 bg-[#141414] shadow-[0_8px_48px_rgba(0,0,0,0.45)] md:max-h-[min(76dvh,30rem)] md:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stalkergift-variant-sheet-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2
            id="stalkergift-variant-sheet-title"
            className="text-base font-semibold text-white"
          >
            Elige variante
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <ul className="stalkergift-modal-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-3 sm:pb-4">
          {variants.map((v) => {
            const sel = selectedId === v.id
            const price = v.tankuPrice || 0
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(v.id)
                    onClose()
                  }}
                  className={`mb-2 w-full rounded-xl border px-3 py-3 text-left transition-colors sm:py-2.5 ${
                    sel
                      ? 'border-[#66DEDB]/50 bg-[#66DEDB]/10 ring-1 ring-inset ring-[#66DEDB]/25'
                      : 'border-white/[0.1] bg-black/20 hover:border-[#FE9600]/35'
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-100">{v.title}</p>
                  <p className="text-[11px] text-zinc-500">SKU: {v.sku}</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#66DEDB]">
                    {formatPrice(price)}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
