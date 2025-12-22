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
    items?: any[] // Agregar items para poder contar correctamente
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

  // Calcular subtotal desde los items si no viene del backend
  // El unit_price que viene del backend ya tiene el incremento aplicado (15% + $10,000)
  // NO debemos aplicar el incremento nuevamente
  const calculatedSubtotal = totals.items?.reduce((sum, item) => {
    // Usar unit_price que ya viene con incremento del backend
    const price = item.unit_price 
      || item.variant?.calculated_price?.calculated_amount 
      || item.variant?.price 
      || (item as any).price
      || 0
    const quantity = item.quantity || 0
    const itemTotal = price * quantity
    return sum + itemTotal
  }, 0) || 0

  // Usar subtotal del backend si existe y es mayor a 0, sino calcular desde items
  const adjustedSubtotal = (subtotal && subtotal > 0) ? subtotal : calculatedSubtotal
  
  console.log(`💰 [CART-TOTALS] Items: ${totals.items?.length || 0}`)
  console.log(`💰 [CART-TOTALS] Subtotal: $${adjustedSubtotal}`)
  // Para el total, calcular manualmente para evitar duplicación
  const adjustedTotal = adjustedSubtotal + (shipping_subtotal || 0) + (tax_total || 0) - (discount_total || 0) - (gift_card_total || 0)

  return (
    <div>
      <div className="flex flex-col gap-y-1 font-medium text-gray-300 text-sm">
        {/* NOTA TEMPORAL */}
        <div className="flex items-center justify-center mb-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <span className="text-xs text-yellow-400">
            ⚠️ PRECIO: +15% + $10,000 por producto
          </span>
        </div>
        
        <div className="flex items-start sm:items-center justify-between">
          <span className="flex gap-x-1 items-center max-w-[65%] sm:max-w-none">
            Subtotal (sin envío e impuestos)
          </span>
          <span className="text-right" data-testid="cart-subtotal" data-value={adjustedSubtotal}>
            {convertToLocale({ amount: adjustedSubtotal, currency_code })}
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
          <span className="max-w-[65%] sm:max-w-none">
            {shipping_subtotal && shipping_subtotal > 0 ? "Envío" : "Envío (por definir)"}
          </span>
          <span className="text-right" data-testid="cart-shipping" data-value={shipping_subtotal || 0}>
            {shipping_subtotal && shipping_subtotal > 0 
              ? convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })
              : ""
            }
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
      <div className="h-px w-full border-b border-gray-700 my-2" />
      <div className="flex items-start sm:items-center justify-between text-white mb-1 font-medium">
        <span className="text-base">Total</span>
        <span
          className="text-lg font-bold text-[#66DEDB] text-right"
          data-testid="cart-total"
          data-value={adjustedTotal}
        >
          {convertToLocale({ amount: adjustedTotal, currency_code })}
        </span>
      </div>
      <div className="h-px w-full border-b border-gray-700 mt-2" />
    </div>
  )
}

export default CartTotals
