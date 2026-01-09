'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useCartStore } from '@/lib/stores/cart-store'
import type { CartItem } from '@/types/api'

interface CartItemProps {
  item: CartItem
}

export function CartItem({ item }: CartItemProps) {
  const { updateItem, removeItem } = useCartStore()
  const [localQuantity, setLocalQuantity] = useState(item.quantity)
  const [error, setError] = useState<string | null>(null)

  // Sincronizar cantidad local cuando cambie el item
  useEffect(() => {
    setLocalQuantity(item.quantity)
  }, [item.quantity])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 10) {
      setError('La cantidad debe estar entre 1 y 10')
      return
    }

    setError(null)
    // Actualizar cantidad local inmediatamente para feedback visual
    setLocalQuantity(newQuantity)

    try {
      await updateItem(item.id, newQuantity)
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar cantidad')
      setLocalQuantity(item.quantity) // Revertir si falla
    }
  }

  const handleRemove = async () => {
    if (!confirm('¿Estás seguro de eliminar este producto del carrito?')) {
      return
    }

    try {
      await removeItem(item.id)
    } catch (err: any) {
      console.error('Error eliminando item:', err)
      alert(err?.message || 'Error al eliminar producto')
    }
  }

  const productImage = item.product?.images?.[0] || '/placeholder.png'
  const productTitle = item.product?.title || 'Producto sin título'
  const variantTitle = item.variant?.title || ''
  const unitPrice = item.unitPrice || item.price || 0
  const total = item.total || unitPrice * item.quantity
  const stock = item.variant?.stock || 0

  return (
    <tr className="hover:bg-gray-900/50 transition-colors">
      {/* Imagen */}
      <td className="p-3 sm:p-4 pl-4 sm:pl-6 align-middle text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 relative rounded-lg overflow-hidden bg-gray-700 mx-auto">
          <Image
            src={productImage}
            alt={productTitle}
            fill
            className="object-cover"
            unoptimized={productImage?.includes('cloudfront.net')}
          />
        </div>
      </td>

      {/* Producto */}
      <td className="p-3 sm:p-4 align-middle">
        <div className="flex flex-col">
          <div className="text-white font-medium mb-1">{productTitle}</div>
          {variantTitle && (
            <div className="text-gray-400 text-sm">{variantTitle}</div>
          )}
          {stock > 0 && (
            <div className="text-gray-500 text-xs mt-1">Stock: {stock}</div>
          )}
        </div>
      </td>

      {/* Cantidad */}
      <td className="p-3 sm:p-4 align-middle text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleQuantityChange(localQuantity - 1)}
            disabled={localQuantity <= 1}
            className="w-8 h-8 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            −
          </button>
          <span className="w-12 text-center text-white font-medium">{localQuantity}</span>
          <button
            onClick={() => handleQuantityChange(localQuantity + 1)}
            disabled={localQuantity >= Math.min(stock, 10)}
            className="w-8 h-8 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            +
          </button>
        </div>
        {error && (
          <div className="text-red-400 text-xs mt-1">{error}</div>
        )}
      </td>

      {/* Precio unitario (oculto en móvil) */}
      <td className="p-3 sm:p-4 align-middle text-center hidden sm:table-cell">
        <div className="text-gray-300">{formatPrice(unitPrice)}</div>
      </td>

      {/* Total y acciones */}
      <td className="p-3 sm:p-4 pr-4 sm:pr-6 align-middle">
        <div className="flex items-center justify-end gap-4">
          <div className="text-right">
            <div className="text-[#66DEDB] font-bold">{formatPrice(total)}</div>
          </div>
          <button
            onClick={handleRemove}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="Eliminar producto"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  )
}

