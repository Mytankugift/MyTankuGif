'use client'

import Image from 'next/image'
import type { ReceiverData } from '@/components/stalkergift/receiver-selector'
import type { ProductDTO } from '@/types/api'
import {
  CHECKOUT_TANKU_SECTION_LABEL,
  CHECKOUT_TANKU_SURFACE,
} from '@/lib/checkout-tanku-design'

interface GiftData {
  receiver: ReceiverData | null
  product: ProductDTO | null
  variantId: string | null
  quantity: number
  senderAlias: string
  senderMessage: string
}

interface GiftSummaryProps {
  giftData: GiftData
  /** Reservados por compatibilidad con el modal (el botón Pagar está en el pie). */
  onSubmit?: () => void
  isSubmitting?: boolean
}

export function GiftSummary({ giftData }: GiftSummaryProps) {
  const selectedVariant = giftData.product?.variants?.find(
    (v) => v.id === giftData.variantId,
  )

  const finalUnitPrice = selectedVariant
    ? selectedVariant.tankuPrice || 0
    : giftData.product?.variants && giftData.product.variants.length > 0
      ? giftData.product.variants[0].tankuPrice || 0
      : 0

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const recipient = (() => {
    const u = giftData.receiver?.user
    if (!u) return { primary: '—', secondary: null as string | null }
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim()
    const un = u.username?.trim()
    if (name && un) return { primary: name, secondary: `@${un}` }
    if (name) return { primary: name, secondary: null }
    if (un) return { primary: `@${un}`, secondary: null }
    return { primary: u.email || '—', secondary: null }
  })()

  return (
    <div className="space-y-4 pb-1">
      <div className={CHECKOUT_TANKU_SURFACE}>
        <p className={CHECKOUT_TANKU_SECTION_LABEL}>Destinatario</p>
        <p className="text-[15px] font-medium leading-snug text-zinc-100">{recipient.primary}</p>
        {recipient.secondary ? (
          <p className="mt-0.5 text-sm text-zinc-500">{recipient.secondary}</p>
        ) : null}
      </div>

      {giftData.product ? (
        <div className={CHECKOUT_TANKU_SURFACE}>
          <p className={CHECKOUT_TANKU_SECTION_LABEL}>Producto</p>
          <div className="flex gap-3">
            {giftData.product.images?.[0] ? (
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/25 ring-1 ring-inset ring-white/[0.04]">
                <Image
                  src={giftData.product.images[0]}
                  alt={giftData.product.title || ''}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-zinc-100">
                {giftData.product.title}
              </p>
              {selectedVariant ? (
                <p className="mt-0.5 truncate text-xs text-zinc-500">{selectedVariant.title}</p>
              ) : null}
              <p className="mt-1 text-sm font-semibold tabular-nums text-[#66DEDB]">
                {formatPrice(finalUnitPrice)}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={CHECKOUT_TANKU_SURFACE}>
        <p className={CHECKOUT_TANKU_SECTION_LABEL}>Remitente</p>
        <p className="text-sm font-medium text-[#66DEDB]">{giftData.senderAlias || '—'}</p>
        {giftData.senderMessage?.trim() ? (
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Mensaje</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-200">{giftData.senderMessage}</p>
          </div>
        ) : null}
      </div>

      <div className={CHECKOUT_TANKU_SURFACE}>
        <p className={CHECKOUT_TANKU_SECTION_LABEL}>Resumen</p>
        <div className="flex justify-between gap-4 text-sm text-zinc-400">
          <span>Subtotal</span>
          <span className="tabular-nums text-zinc-200">{formatPrice(finalUnitPrice)}</span>
        </div>
        <div className="my-4 border-t border-white/[0.1]" />
        <div className="flex justify-between gap-4 text-lg font-semibold tabular-nums text-[#73FFA2]">
          <span>Total</span>
          <span>{formatPrice(finalUnitPrice)}</span>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
          La pasarela de pago procesa tu compra de forma segura (ePayco).
        </p>
      </div>

      <div className="rounded-xl border border-[#66DEDB]/25 bg-[#66DEDB]/10 p-4 backdrop-blur-sm ring-1 ring-inset ring-[#66DEDB]/15">
        <p className="text-sm font-medium text-[#66DEDB]">Después del pago</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Recibirás un enlace único para compartir con el receptor. El regalo queda pendiente hasta que lo
          acepte.
        </p>
      </div>
    </div>
  )
}
