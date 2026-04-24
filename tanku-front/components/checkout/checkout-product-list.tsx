'use client'

import Image from 'next/image'
import type { Cart } from '@/types/api'
import { CHECKOUT_TANKU_SECTION_LABEL, CHECKOUT_TANKU_SURFACE } from '@/lib/checkout-tanku-design'

type Item = Cart['items'][number]

interface CheckoutProductListProps {
  items: Item[]
}

export function CheckoutProductList({ items }: CheckoutProductListProps) {
  const formatPrice = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className={CHECKOUT_TANKU_SURFACE}>
      <p className={CHECKOUT_TANKU_SECTION_LABEL}>Productos</p>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            {item.product?.images?.[0] ? (
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/25 ring-1 ring-inset ring-white/[0.04] backdrop-blur-sm sm:h-24 sm:w-24">
                <Image
                  src={item.product.images[0]}
                  alt={item.product.title || 'Producto'}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20 text-xs text-zinc-600 sm:h-24 sm:w-24">
                —
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-zinc-100">{item.product?.title || 'Producto'}</p>
              {item.variant?.title && <p className="mt-0.5 truncate text-xs text-zinc-500">{item.variant.title}</p>}
              <p className="mt-1 text-xs text-zinc-500">Cantidad · {item.quantity}</p>
              <p className="mt-1.5 text-sm font-semibold tabular-nums text-[#66DEDB]">
                {formatPrice(item.total || (item.unitPrice || item.price || 0) * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
