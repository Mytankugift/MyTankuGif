'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Cart } from '@/types/api'
import { CHECKOUT_TANKU_SECTION_LABEL, CHECKOUT_TANKU_SURFACE } from '@/lib/checkout-tanku-design'

export function buildCartCheckoutHref(cart: Cart, selectedItems?: Set<string>): string {
  if (cart.isGiftCart) {
    return `/checkout/gift?cartId=${cart.id}`
  }
  if (selectedItems && selectedItems.size > 0) {
    return `/checkout?items=${Array.from(selectedItems).join(',')}`
  }
  return '/checkout'
}

interface CartSummaryProps {
  cart: Cart
  selectedItems?: Set<string>
}

export function CartSummary({ cart, selectedItems }: CartSummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const selectedItemsList = selectedItems
    ? cart.items.filter((item) => selectedItems.has(item.id))
    : cart.items

  const subtotal = selectedItemsList.reduce((sum, item) => {
    return sum + (item.total || (item.unitPrice || item.price || 0) * item.quantity)
  }, 0)

  const shipping = 0
  const tax = 0
  const total = subtotal
  const href = buildCartCheckoutHref(cart, selectedItems)
  const checkoutDisabled = selectedItems ? selectedItems.size === 0 : false

  return (
    <div className={`${CHECKOUT_TANKU_SURFACE} flex flex-col gap-4`}>
      <h2 className={`${CHECKOUT_TANKU_SECTION_LABEL} !mb-0`}>Resumen</h2>

      <div className="flex justify-between text-sm text-zinc-300">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      {shipping > 0 && (
        <div className="flex justify-between text-sm text-zinc-300">
          <span>Envío</span>
          <span>{formatPrice(shipping)}</span>
        </div>
      )}

      {tax > 0 && (
        <div className="flex justify-between text-sm text-zinc-300">
          <span>Impuestos</span>
          <span>{formatPrice(tax)}</span>
        </div>
      )}

      <div className="my-1 border-t border-white/[0.08]" />

      <div className="flex justify-between text-lg font-bold text-[#66DEDB]">
        <span>Total</span>
        <span>{formatPrice(total)}</span>
      </div>

      <Link href={href} className="mt-1 hidden lg:block">
        <Button
          disabled={checkoutDisabled}
          className="w-full py-2.5 text-sm font-semibold hover:!bg-[#5ac8c4] disabled:cursor-not-allowed disabled:opacity-50 sm:py-3 sm:text-base"
          style={{
            backgroundColor: '#66DEDB',
            color: '#2C3137',
            borderRadius: '25px',
            boxShadow: '0px 4px 4px 0px #00000040 inset',
          }}
        >
          Proceder al pago{selectedItems && selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}
        </Button>
      </Link>

      <Link
        href="/feed"
        className="text-center text-sm font-medium text-[#66DEDB] transition-colors hover:text-[#5accc9]"
      >
        Continuar comprando
      </Link>
    </div>
  )
}
