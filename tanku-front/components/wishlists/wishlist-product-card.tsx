/**
 * Card sutil de producto para wishlist
 */

'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useCartStore } from '@/lib/stores/cart-store'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import type { WishListDTO } from '@/types/api'

interface WishlistProductCardProps {
  item: WishListDTO['items'][0]
  onAddToCart: (variantId?: string) => Promise<void>
}

export function WishlistProductCard({ item, onAddToCart }: WishlistProductCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [imageError, setImageError] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }
  
  // tankuPrice ya viene calculado del backend

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      await onAddToCart(item.variantId || undefined)
    } catch (error) {
      console.error('Error agregando al carrito:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const displayPrice = item.variant?.tankuPrice || item.product.thumbnail ? null : null // Necesitaríamos el precio del producto

  return (
    <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/30 hover:border-[#73FFA2]/30 transition-all group">
      <div className="relative aspect-square rounded overflow-hidden bg-gray-700/30 mb-2">
        {!imageError && item.product.thumbnail ? (
          <Image
            src={item.product.thumbnail}
            alt={item.product.title}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-500 text-xs">Sin imagen</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h4 className="text-xs text-white font-medium line-clamp-2 min-h-[2rem]">
          {item.product.title}
          {item.variant && (
            <span className="block text-[10px] text-gray-400 mt-0.5">
              {item.variant.title}
            </span>
          )}
        </h4>

        {item.variant && item.variant.tankuPrice && (
          <p className="text-xs font-semibold text-[#3B9BC3]">
            {formatPrice(item.variant.tankuPrice)}
          </p>
        )}

        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className="w-full py-1.5 px-2 text-[10px] bg-[#73FFA2] text-gray-900 font-semibold rounded hover:bg-[#66DEDB] transition-colors disabled:opacity-50"
        >
          {isAdding ? 'Agregando...' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  )
}

