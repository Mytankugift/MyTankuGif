'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import type { ProductDTO } from '@/types/api'
import { CHECKOUT_TANKU_INPUT, CHECKOUT_TANKU_SURFACE } from '@/lib/checkout-tanku-design'
import { StalkerGiftVariantSheet } from '@/components/stalkergift/stalkergift-variant-sheet'

interface GiftConfigProps {
  product: ProductDTO | null
  variantId: string | null
  senderAlias: string
  senderMessage: string
  onChange: (updates: {
    variantId?: string | null
    senderAlias?: string
    senderMessage?: string
  }) => void
}

export function GiftConfig({
  product,
  variantId,
  senderAlias,
  senderMessage,
  onChange,
}: GiftConfigProps) {
  const [variantSheetOpen, setVariantSheetOpen] = useState(false)

  /** Un solo SKU: fijar variante sin hoja. Varias: el padre llega sin variante hasta que el usuario elija. */
  useEffect(() => {
    if (!product?.variants?.length || product.variants.length !== 1) return
    const id = product.variants[0].id
    if (variantId !== id) onChange({ variantId: id })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- al cambiar producto o variante en memoria
  }, [product?.id, product?.variants?.length, variantId])

  const selectedVariant = product?.variants?.find((v) => v.id === variantId)

  const multiVariant = !!(product?.variants && product.variants.length > 1)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const finalUnitPrice = selectedVariant
    ? selectedVariant.tankuPrice || 0
    : product?.variants?.length === 1
      ? product.variants[0].tankuPrice || 0
      : 0

  if (!product) {
    return (
      <div className="py-12 text-center text-zinc-400">
        Por favor selecciona un producto primero
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className={`${CHECKOUT_TANKU_SURFACE} !p-4 sm:!p-5`}>
        <h3 className="sr-only">Producto elegido</h3>
        <div className="flex gap-3 sm:gap-3.5">
          {product.images && product.images.length > 0 && (
            <div className="relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/25 ring-1 ring-inset ring-white/[0.04] sm:h-[4.5rem] sm:w-[4.5rem]">
              <Image
                src={product.images[0]}
                alt={product.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h4 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 sm:text-[0.9375rem]">
              {product.title}
            </h4>
            <p className="mt-1 text-xs tabular-nums font-semibold text-[#73FFA2] sm:text-sm">
              {multiVariant && !selectedVariant ? (
                <span className="font-medium text-zinc-500">Elige una variante abajo</span>
              ) : (
                formatPrice(finalUnitPrice)
              )}
            </p>
          </div>
        </div>

        {multiVariant ? (
          <button
            type="button"
            onClick={() => setVariantSheetOpen(true)}
            className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.12] bg-black/20 px-3 py-2.5 text-left transition hover:border-[#FE9600]/35"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Variante
              </span>
              {selectedVariant ? (
                <span className="block truncate text-sm font-medium text-zinc-100">{selectedVariant.title}</span>
              ) : (
                <span className="block text-sm text-amber-200/95">Toca para elegir opción</span>
              )}
            </span>
            <ChevronDownIcon className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
          </button>
        ) : null}
      </div>

      {multiVariant && product.variants ? (
        <StalkerGiftVariantSheet
          open={variantSheetOpen}
          variants={product.variants}
          selectedId={variantId}
          onClose={() => setVariantSheetOpen(false)}
          onSelect={(id) => {
            onChange({ variantId: id })
          }}
          formatPrice={formatPrice}
        />
      ) : null}

      <div className={CHECKOUT_TANKU_SURFACE}>
        <label
          htmlFor="stalkergift-sender-alias"
          className="mb-2 block text-xs font-medium text-zinc-400"
        >
          Alias{' '}
          <span className="text-[#FE9600]" aria-hidden>
            *
          </span>{' '}
          <span className="font-normal text-zinc-500">(obligatorio)</span>
        </label>
        <input
          id="stalkergift-sender-alias"
          type="text"
          value={senderAlias}
          onChange={(e) => onChange({ senderAlias: e.target.value })}
          placeholder="Tu alias — cómo quieres que te nombre el receptor *"
          required
          maxLength={50}
          className={CHECKOUT_TANKU_INPUT}
          autoComplete="off"
        />
      </div>

      <div className={CHECKOUT_TANKU_SURFACE}>
        <label className="sr-only" htmlFor="stalkergift-sender-message">
          Mensaje opcional para el receptor
        </label>
        <textarea
          id="stalkergift-sender-message"
          value={senderMessage}
          onChange={(e) => onChange({ senderMessage: e.target.value })}
          placeholder="Unas palabras para acompañar el regalo…"
          rows={4}
          maxLength={500}
          className={`${CHECKOUT_TANKU_INPUT} min-h-[6.5rem] resize-none`}
        />
        <p className="mt-2 text-xs text-zinc-500">{senderMessage.length}/500 caracteres</p>
      </div>
    </div>
  )
}
