'use client'

import Image from 'next/image'
import type { Cart } from '@/types/api'

interface CheckoutSummaryProps {
  cart: Cart
}

export function CheckoutSummary({ cart }: CheckoutSummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Calcular subtotal y total basado en los items del carrito (que ya están filtrados)
  const subtotal = cart.items.reduce((sum, item) => {
    return sum + (item.total || (item.unitPrice || item.price || 0) * item.quantity)
  }, 0)
  const shipping = 0 // Por ahora sin envío
  const tax = 0 // Por ahora sin impuestos
  const total = subtotal

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <h2 className="text-xl font-bold text-[#66DEDB] mb-4">Resumen del pedido</h2>

      {/* Items */}
      <div className="space-y-4 mb-6">
        {cart.items.map((item) => (
          <div key={item.id} className="flex gap-3">
            {item.product?.images?.[0] && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={item.product.images[0]}
                  alt={item.product.title || 'Producto'}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {item.product?.title || 'Producto'}
              </p>
              {item.variant?.title && (
                <p className="text-xs text-gray-400 truncate">
                  {item.variant.title}
                </p>
              )}
              <p className="text-xs text-gray-400">
                Cantidad: {item.quantity}
              </p>
              <p className="text-sm font-semibold text-[#66DEDB] mt-1">
                {formatPrice(item.total)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700 my-4"></div>

      {/* Totales */}
      <div className="space-y-2">
        <div className="flex justify-between text-gray-300">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {shipping > 0 && (
          <div className="flex justify-between text-gray-300">
            <span>Envío</span>
            <span>{formatPrice(shipping)}</span>
          </div>
        )}

        {tax > 0 && (
          <div className="flex justify-between text-gray-300">
            <span>Impuestos</span>
            <span>{formatPrice(tax)}</span>
          </div>
        )}

        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="flex justify-between text-xl font-bold text-[#66DEDB]">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

