'use client'

import Image from 'next/image'
import type { ProductDTO } from '@/types/api'

interface GiftData {
  receiver: {
    type: 'tanku' | 'external'
    user?: {
      id: string
      firstName?: string | null
      lastName?: string | null
      email?: string
    }
    externalData?: {
      email?: string
      instagram?: string
      phone?: string
      name?: string
    }
  } | null
  product: ProductDTO | null
  variantId: string | null
  quantity: number
  senderAlias: string
  senderMessage: string
}

interface GiftSummaryProps {
  giftData: GiftData
  onSubmit: () => void
  isSubmitting: boolean
}

export function GiftSummary({ giftData, onSubmit, isSubmitting }: GiftSummaryProps) {
  const selectedVariant = giftData.product?.variants?.find(
    (v) => v.id === giftData.variantId
  )

  // Precio base (sin incremento)
  const baseUnitPrice = selectedVariant
    ? selectedVariant.suggestedPrice || selectedVariant.price
    : giftData.product?.variants && giftData.product.variants.length > 0
    ? giftData.product.variants[0].suggestedPrice || giftData.product.variants[0].price
    : 0

  // Aplicar incremento: (precio * 1.15) + 10,000 por unidad
  const finalUnitPrice = baseUnitPrice > 0 ? Math.round((baseUnitPrice * 1.15) + 10000) : 0
  const subtotal = finalUnitPrice * giftData.quantity

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getReceiverName = () => {
    if (!giftData.receiver) return 'No seleccionado'
    if (giftData.receiver.type === 'tanku' && giftData.receiver.user) {
      return giftData.receiver.user.firstName && giftData.receiver.user.lastName
        ? `${giftData.receiver.user.firstName} ${giftData.receiver.user.lastName}`
        : giftData.receiver.user.email || 'Usuario de Tanku'
    }
    if (giftData.receiver.type === 'external' && giftData.receiver.externalData) {
      return (
        giftData.receiver.externalData.name ||
        giftData.receiver.externalData.instagram ||
        giftData.receiver.externalData.email ||
        giftData.receiver.externalData.phone ||
        'Usuario externo'
      )
    }
    return 'No seleccionado'
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Resumen del regalo</h3>
        <p className="text-sm text-gray-400">Revisa los detalles antes de proceder con el pago</p>
      </div>

      {/* Receptor */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Para:</h4>
        <p className="text-base font-medium text-white">{getReceiverName()}</p>
        {giftData.receiver?.type === 'external' && giftData.receiver.externalData && (
          <div className="mt-2 space-y-1">
            {giftData.receiver.externalData.email && (
              <p className="text-xs text-gray-400">Email: {giftData.receiver.externalData.email}</p>
            )}
            {giftData.receiver.externalData.instagram && (
              <p className="text-xs text-gray-400">
                Instagram: {giftData.receiver.externalData.instagram}
              </p>
            )}
            {giftData.receiver.externalData.phone && (
              <p className="text-xs text-gray-400">Teléfono: {giftData.receiver.externalData.phone}</p>
            )}
          </div>
        )}
      </div>

      {/* Producto */}
      {giftData.product && (
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex gap-4">
            {giftData.product.images && giftData.product.images.length > 0 && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={giftData.product.images[0]}
                  alt={giftData.product.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-white mb-1 truncate">
                {giftData.product.title}
              </h4>
              {selectedVariant && (
                <p className="text-sm text-gray-400 mb-1">Variante: {selectedVariant.title}</p>
              )}
              <p className="text-sm text-gray-400">Cantidad: {giftData.quantity}</p>
            </div>
          </div>
        </div>
      )}

      {/* Configuración */}
      <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-1">De:</h4>
          <p className="text-base font-medium text-[#66DEDB]">{giftData.senderAlias}</p>
        </div>
        {giftData.senderMessage && (
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-1">Mensaje:</h4>
            <p className="text-sm text-white">{giftData.senderMessage}</p>
          </div>
        )}
      </div>

      {/* Resumen de precio */}
      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Resumen de pago</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Precio base:</span>
            <span className="text-sm text-gray-400">{formatPrice(baseUnitPrice)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Precio unitario (con incremento):</span>
            <span className="text-sm font-semibold text-white">{formatPrice(finalUnitPrice)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Cantidad:</span>
            <span className="text-sm font-semibold text-white">{giftData.quantity}</span>
          </div>
          <div className="border-t border-gray-600 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-[#66DEDB]">Total:</span>
              <span className="text-xl font-bold text-[#66DEDB]">{formatPrice(subtotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Método de pago */}
      <div className="bg-gray-700/50 rounded-lg p-4 border border-[#66DEDB]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Pago con ePayco</h4>
            <p className="text-xs text-gray-400">
              Serás redirigido a ePayco para completar el pago de forma segura
            </p>
          </div>
        </div>
      </div>

      {/* Nota */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <p className="text-sm text-blue-200">
          <strong>Importante:</strong> Después del pago, se generará un link único para compartir
          con el receptor. El regalo quedará pendiente hasta que sea aceptado.
        </p>
      </div>
    </div>
  )
}

