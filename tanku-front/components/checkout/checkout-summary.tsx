'use client'

import Image from 'next/image'
import type { Cart } from '@/types/api'
import { CHECKOUT_TANKU_SECTION_LABEL, CHECKOUT_TANKU_SURFACE } from '@/lib/checkout-tanku-design'

interface CheckoutSummaryProps {
  cart: Cart
  isGiftCart?: boolean
  /** `false`: solo subtotal y total (líneas en `CheckoutProductList`). Por defecto `true` (compat) */
  showLineItems?: boolean
}

export function CheckoutSummary({ cart, isGiftCart = false, showLineItems = true }: CheckoutSummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const subtotal = cart.items.reduce((sum, item) => {
    return sum + (item.total || (item.unitPrice || item.price || 0) * item.quantity)
  }, 0)
  const shipping = 0
  const tax = 0
  const total = subtotal

  return (
    <div className={CHECKOUT_TANKU_SURFACE}>
      <p className={CHECKOUT_TANKU_SECTION_LABEL}>Resumen</p>

      {isGiftCart && showLineItems && (
        <div className="mb-4 rounded-xl border border-[#66DEDB]/25 bg-[#66DEDB]/10 p-3 backdrop-blur-sm ring-1 ring-inset ring-[#66DEDB]/15">
          <p className="text-sm font-medium text-[#66DEDB]">Enviando como regalo</p>
          <p className="mt-1 text-xs text-zinc-400">El pedido se envía a la dirección del destinatario.</p>
        </div>
      )}

      {showLineItems && (
        <>
          <div className="mb-6 space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                {item.product?.images?.[0] && (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/25 ring-1 ring-inset ring-white/[0.04] backdrop-blur-sm">
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.title || 'Producto'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">{item.product?.title || 'Producto'}</p>
                  {item.variant?.title && <p className="truncate text-xs text-zinc-500">{item.variant.title}</p>}
                  <p className="text-xs text-zinc-500">Cantidad: {item.quantity}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-[#66DEDB]">{formatPrice(item.total)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="my-4 border-t border-white/[0.1]" />
        </>
      )}

      <div className="space-y-2">
        <div className="flex justify-between gap-4 text-sm text-zinc-400">
          <span>Subtotal</span>
          <span className="tabular-nums text-zinc-200">{formatPrice(subtotal)}</span>
        </div>

        {shipping > 0 && (
          <div className="flex justify-between gap-4 text-sm text-zinc-400">
            <span>Envío</span>
            <span className="tabular-nums text-zinc-200">{formatPrice(shipping)}</span>
          </div>
        )}

        {tax > 0 && (
          <div className="flex justify-between gap-4 text-sm text-zinc-400">
            <span>Impuestos</span>
            <span className="tabular-nums text-zinc-200">{formatPrice(tax)}</span>
          </div>
        )}

        <div className="mt-2 border-t border-white/[0.1] pt-2">
          <div className="flex justify-between text-lg font-semibold tabular-nums text-[#73FFA2]">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
        {!showLineItems && (
          <p className="mt-3 text-xs text-zinc-500">Envío incluido en el precio.</p>
        )}
      </div>
    </div>
  )
}
