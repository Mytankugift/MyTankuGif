"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    shipping_total?: number | null
    discount_total?: number | null
    gift_card_total?: number | null
    currency_code: string
    shipping_subtotal?: number | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const {
    currency_code,
    total,
    subtotal,
    tax_total,
    discount_total,
    gift_card_total,
    shipping_subtotal,
  } = totals

  return (
    <div>
      <div className="flex flex-col gap-y-1 sm:gap-y-2 font-medium text-gray-300 text-sm sm:text-base">
        <div className="flex items-start sm:items-center justify-between">
          <span className="flex gap-x-1 items-center max-w-[65%] sm:max-w-none">
            Subtotal (sin envío e impuestos)
          </span>
          <span className="text-right" data-testid="cart-subtotal" data-value={subtotal || 0}>
            {convertToLocale({ amount: subtotal ?? 0, currency_code })}
          </span>
        </div>
        {!!discount_total && (
          <div className="flex items-start sm:items-center justify-between">
            <span className="max-w-[65%] sm:max-w-none">Descuento</span>
            <span
              className="text-[#66DEDB] text-right"
              data-testid="cart-discount"
              data-value={discount_total || 0}
            >
              -{" "}
              {convertToLocale({ amount: discount_total ?? 0, currency_code })}
            </span>
          </div>
        )}
        <div className="flex items-start sm:items-center justify-between">
          <span className="max-w-[65%] sm:max-w-none">Envío</span>
          <span className="text-right" data-testid="cart-shipping" data-value={shipping_subtotal || 0}>
            {convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })}
          </span>
        </div>
        <div className="flex items-start sm:items-center justify-between">
          <span className="flex gap-x-1 items-center max-w-[65%] sm:max-w-none">Impuestos</span>
          <span className="text-right" data-testid="cart-taxes" data-value={tax_total || 0}>
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
          </span>
        </div>
        {!!gift_card_total && (
          <div className="flex items-start sm:items-center justify-between">
            <span className="max-w-[65%] sm:max-w-none">Tarjeta de regalo</span>
            <span
              className="text-[#66DEDB] text-right"
              data-testid="cart-gift-card-amount"
              data-value={gift_card_total || 0}
            >
              -{" "}
              {convertToLocale({ amount: gift_card_total ?? 0, currency_code })}
            </span>
          </div>
        )}
      </div>
      <div className="h-px w-full border-b border-gray-700 my-3 sm:my-4" />
      <div className="flex items-start sm:items-center justify-between text-white mb-2 font-medium">
        <span className="text-base sm:text-lg">Total</span>
        <span
          className="text-lg sm:text-xl font-bold text-[#66DEDB] text-right"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>
      <div className="h-px w-full border-b border-gray-700 mt-3 sm:mt-4" />
    </div>
  )
}

export default CartTotals
