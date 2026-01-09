'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Cart } from '@/types/api'

interface CartSummaryProps {
  cart: Cart
}

export function CartSummary({ cart }: CartSummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const subtotal = cart.subtotal || 0
  const shipping = 0 // Por ahora sin envío
  const tax = 0 // Por ahora sin impuestos
  const total = cart.total || subtotal

  return (
    <div className="flex flex-col gap-4 bg-gray-800/50 rounded-lg p-4 sm:p-6">
      <h2 className="text-2xl font-bold text-[#66DEDB] mb-2">Resumen</h2>

      {/* Subtotal */}
      <div className="flex justify-between text-gray-300">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      {/* Envío */}
      {shipping > 0 && (
        <div className="flex justify-between text-gray-300">
          <span>Envío</span>
          <span>{formatPrice(shipping)}</span>
        </div>
      )}

      {/* Impuestos */}
      {tax > 0 && (
        <div className="flex justify-between text-gray-300">
          <span>Impuestos</span>
          <span>{formatPrice(tax)}</span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-700 my-2"></div>

      {/* Total */}
      <div className="flex justify-between text-xl font-bold text-[#66DEDB]">
        <span>Total</span>
        <span>{formatPrice(total)}</span>
      </div>

      {/* Botón de checkout */}
      <Link href="/checkout" className="mt-4">
        <Button className="w-full bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold py-3 text-base">
          Ir a pagar
        </Button>
      </Link>

      {/* Continuar comprando */}
      <Link href="/feed" className="text-center">
        <button className="text-[#66DEDB] hover:text-[#5accc9] text-sm font-medium transition-colors">
          Continuar comprando
        </button>
      </Link>
    </div>
  )
}

