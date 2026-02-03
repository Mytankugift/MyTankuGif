/**
 * Componente para mostrar productos de la wishlist automática "Me gusta"
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { WishlistSelectorModal } from './wishlist-selector-modal'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { WishListDTO } from '@/types/api'

export function LikedProductsViewer() {
  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  const router = useRouter()
  const [wishlist, setWishlist] = useState<WishListDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    fetchLikedWishlist()
  }, [isAuthenticated])

  const fetchLikedWishlist = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get<WishListDTO | null>(
        API_ENDPOINTS.WISHLISTS.LIKED
      )
      if (response.success) {
        setWishlist(response.data)
      }
    } catch (error) {
      console.error('Error cargando wishlist "Me gusta":', error)
      setWishlist(null)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)

  const getDisplayPrice = (item: WishListDTO['items'][0]) => {
    const finalPrice = item.variant?.tankuPrice || 0
    if (finalPrice > 0) {
      return formatPrice(finalPrice)
    }
    return '—'
  }

  const handleAddToCartFromWishlistItem = async (item: WishListDTO['items'][0]) => {
    if (item.variantId) {
      await addItem(item.variantId, 1)
      return
    }

    const handle = item.product.handle
    if (!handle) return
    const fullProduct = await fetchProductByHandle(handle)
    const variants = fullProduct?.variants || []
    if (variants.length === 1) {
      await addItem(variants[0].id, 1)
      return
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!wishlist) return

    try {
      // Primero quitar el like del producto
      const productId = wishlist.items.find(item => item.id === itemId)?.product.id
      if (productId) {
        try {
          await apiClient.delete(
            API_ENDPOINTS.PRODUCTS.UNLIKE(productId)
          )
        } catch (error) {
          console.error('Error removiendo like:', error)
          // Continuar aunque falle el unlike, para quitar de la wishlist
        }
      }

      // Actualizar estado local inmediatamente (optimistic update)
      setWishlist(prev => {
        if (!prev) return null
        return {
          ...prev,
          items: prev.items.filter(item => item.id !== itemId)
        }
      })

      // Luego quitar de la wishlist en el backend
      const response = await apiClient.delete(
        API_ENDPOINTS.WISHLISTS.REMOVE_ITEM(wishlist.id, itemId)
      )
      if (response.success) {
        // Recargar wishlist para sincronizar con el backend
        await fetchLikedWishlist()
      } else {
        // Si falla, revertir el cambio optimista
        await fetchLikedWishlist()
      }
    } catch (error) {
      console.error('Error removiendo item:', error)
      // Si falla, recargar para restaurar el estado correcto
      await fetchLikedWishlist()
    }
  }

  const handleMoveToWishlist = (productId: string) => {
    setSelectedProduct(productId)
    setIsWishlistModalOpen(true)
  }

  const handleMoveComplete = () => {
    setIsWishlistModalOpen(false)
    setSelectedProduct(null)
    // No recargar la wishlist automática, el producto se mantiene (duplicar)
  }

  if (!isAuthenticated) {
    return (
      <div className="py-8 text-center text-gray-400">
        Debes iniciar sesión para ver tus productos favoritos
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-gray-400">
        Cargando productos...
      </div>
    )
  }

  if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        <p className="text-lg mb-2">No tienes productos favoritos aún</p>
        <p className="text-sm">Da "me gusta" a productos para agregarlos aquí</p>
      </div>
    )
  }

  const itemsArray = Array.isArray(wishlist.items) ? wishlist.items : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Me gusta</h2>
          <p className="text-gray-400 text-sm">
            {itemsArray.length} producto{itemsArray.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {itemsArray.map((item) => (
          <div
            key={item.id}
            className="group relative bg-gray-800/30 rounded-lg overflow-hidden border border-gray-700/30 hover:border-[#73FFA2]/50 transition-colors"
          >
            <Link href={`/products/${item.product.handle}`}>
              <div className="relative w-full aspect-square bg-gray-700/30">
                {(() => {
                  const product = item.product as any; // Type assertion para acceder a images
                  const imageUrl = (product.images && product.images.length > 0) 
                    ? product.images[0] 
                    : product.thumbnail;
                  
                  return imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={item.product.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-500 text-xs">Sin imagen</span>
                    </div>
                  );
                })()}
              </div>
            </Link>

            <div className="p-3">
              <Link href={`/product/${item.product.handle}`}>
                <h3 className="text-sm font-medium text-white line-clamp-2 mb-1 group-hover:text-[#73FFA2] transition-colors">
                  {item.product.title}
                </h3>
              </Link>

              <div className="text-xs font-semibold text-[#3B9BC3] mb-2">
                {getDisplayPrice(item)}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    await handleAddToCartFromWishlistItem(item)
                  }}
                  className="flex-1 py-1.5 px-2 text-xs bg-[#3B9BC3] hover:bg-[#2a7a9a] text-white rounded transition-colors flex items-center justify-center gap-1"
                  title="Agregar al carrito"
                >
                  <Image
                    src="/feed/Icons/Shopping_Cart_Green.png"
                    alt="Carrito"
                    width={14}
                    height={14}
                    className="object-contain"
                    style={{ width: 'auto', height: 'auto' }}
                  />
                  Carrito
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleMoveToWishlist(item.product.id)
                  }}
                  className="py-1.5 px-2 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  title="Mover a wishlist"
                >
                  Mover
                </button>

                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    await handleRemoveItem(item.id)
                  }}
                  className="py-1.5 px-2 text-xs bg-gray-700 hover:bg-red-600 text-white rounded transition-colors"
                  title="Quitar de favoritos"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para mover a wishlist */}
      {selectedProduct && (
        <WishlistSelectorModal
          isOpen={isWishlistModalOpen}
          onClose={() => {
            setIsWishlistModalOpen(false)
            setSelectedProduct(null)
          }}
          productId={selectedProduct}
          onAdded={handleMoveComplete}
        />
      )}
    </div>
  )
}

