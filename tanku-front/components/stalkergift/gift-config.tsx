'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ProductDTO } from '@/types/api'

interface GiftConfigProps {
  product: ProductDTO | null
  variantId: string | null
  quantity: number
  senderAlias: string
  senderMessage: string
  onChange: (updates: {
    variantId?: string | null
    quantity?: number
    senderAlias?: string
    senderMessage?: string
  }) => void
}

export function GiftConfig({
  product,
  variantId,
  quantity,
  senderAlias,
  senderMessage,
  onChange,
}: GiftConfigProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(variantId)

  const selectedVariant = product?.variants?.find((v) => v.id === selectedVariantId)

  const handleVariantChange = (newVariantId: string) => {
    setSelectedVariantId(newVariantId)
    onChange({ variantId: newVariantId })
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      onChange({ quantity: newQuantity })
    }
  }

  if (!product) {
    return (
      <div className="text-center py-12 text-gray-400">
        Por favor selecciona un producto primero
      </div>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Precio base (sin incremento)
  const baseUnitPrice = selectedVariant
    ? selectedVariant.suggestedPrice || selectedVariant.price
    : product.variants && product.variants.length > 0
    ? product.variants[0].suggestedPrice || product.variants[0].price
    : 0

  // Aplicar incremento: (precio * 1.15) + 10,000 por unidad
  const finalUnitPrice = baseUnitPrice > 0 ? Math.round((baseUnitPrice * 1.15) + 10000) : 0
  const subtotal = finalUnitPrice * quantity

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Configura el regalo</h3>
        <p className="text-sm text-gray-400">Personaliza tu regalo con un alias y mensaje</p>
      </div>

      {/* Producto seleccionado */}
      <div className="bg-gray-700/50 rounded-lg p-4 flex gap-4">
        {product.images && product.images.length > 0 && (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-white mb-1 truncate">{product.title}</h4>
          {selectedVariant && (
            <p className="text-sm text-gray-400 mb-1">Variante: {selectedVariant.title}</p>
          )}
          <p className="text-sm font-semibold text-[#66DEDB]">{formatPrice(subtotal)}</p>
        </div>
      </div>

      {/* Selección de variante (si tiene) */}
      {product.variants && product.variants.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Seleccionar variante
          </label>
          <div className="grid grid-cols-2 gap-2">
            {product.variants.map((variant) => {
              const isSelected = selectedVariantId === variant.id
              const variantPrice = variant.suggestedPrice || variant.price

              return (
                <button
                  key={variant.id}
                  onClick={() => handleVariantChange(variant.id)}
                  className={`p-3 rounded-lg border-2 transition-colors text-left ${
                    isSelected
                      ? 'border-[#66DEDB] bg-[#66DEDB]/10'
                      : 'border-gray-600 bg-gray-700/50 hover:bg-gray-700'
                  }`}
                >
                  <p className="text-sm font-medium text-white mb-1">{variant.title}</p>
                  <p className="text-xs text-gray-400 mb-1">SKU: {variant.sku}</p>
                  <p className="text-sm font-semibold text-[#66DEDB]">
                    {formatPrice(variantPrice)}
                  </p>
                  {isSelected && (
                    <p className="text-xs text-[#73FFA2] mt-1">✓ Seleccionado</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Cantidad */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Cantidad</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            className="w-10 h-10 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
            min={1}
            className="w-20 px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none text-center"
          />
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity + 1)}
            className="w-10 h-10 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Alias del sender (obligatorio) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tu alias <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={senderAlias}
          onChange={(e) => onChange({ senderAlias: e.target.value })}
          placeholder="Ej: Tu amigo secreto, Anónimo, etc."
          required
          maxLength={50}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          Este es el nombre que verá el receptor del regalo
        </p>
      </div>

      {/* Mensaje personalizado (opcional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Mensaje personalizado <span className="text-gray-500">(opcional)</span>
        </label>
        <textarea
          value={senderMessage}
          onChange={(e) => onChange({ senderMessage: e.target.value })}
          placeholder="Escribe un mensaje para acompañar tu regalo..."
          rows={4}
          maxLength={500}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#66DEDB] focus:outline-none resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          {senderMessage.length}/500 caracteres
        </p>
      </div>

      {/* Resumen de precio */}
      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-300">Precio base:</span>
          <span className="text-sm text-gray-400">{formatPrice(baseUnitPrice)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-300">Precio unitario (con incremento):</span>
          <span className="text-sm font-semibold text-white">{formatPrice(finalUnitPrice)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-300">Cantidad:</span>
          <span className="text-sm font-semibold text-white">{quantity}</span>
        </div>
        <div className="border-t border-gray-600 pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-[#66DEDB]">Subtotal:</span>
            <span className="text-lg font-bold text-[#66DEDB]">{formatPrice(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

