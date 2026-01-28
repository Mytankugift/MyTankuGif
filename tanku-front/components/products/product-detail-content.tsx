'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useProduct } from '@/lib/hooks/use-product'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { VariantSelector } from '@/components/products/variant-selector'
import { ShareIcon, HeartIcon, BookmarkIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { ShareProductModal } from './share-product-modal'
import { WishlistSelectorModal } from '@/components/wishlists/wishlist-selector-modal'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { ProductDTO, FeedItemDTO } from '@/types/api'

interface ProductDetailContentProps {
  product: FeedItemDTO
  isPageView?: boolean
}

export function ProductDetailContent({ product, isPageView = false }: ProductDetailContentProps) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const { addItem, isLoading: isCartLoading } = useCartStore()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showWishlistModal, setShowWishlistModal] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)

  // Cargar producto completo usando el hook
  const { product: fullProduct, isLoading: isLoadingProduct, error: productError } = useProduct(
    product?.handle || null,
    { enabled: !!product?.handle }
  )

  useEffect(() => {
    if (product) {
      setCurrentImageIndex(0)
      setSelectedVariantIndex(0)
      setQuantity(1)
      setError(null)
    }
  }, [product])

  // Cargar datos de likes
  useEffect(() => {
    if (!fullProduct?.id) return

    const loadLikesData = async () => {
      try {
        const likesResponse = await apiClient.get<{ likesCount: number }>(
          API_ENDPOINTS.PRODUCTS.LIKES_COUNT(fullProduct.id)
        )
        if (likesResponse.success && likesResponse.data) {
          setLikesCount(likesResponse.data.likesCount)
        }

        if (isAuthenticated) {
          const likedResponse = await apiClient.get<{ isLiked: boolean }>(
            API_ENDPOINTS.PRODUCTS.IS_LIKED(fullProduct.id)
          )
          if (likedResponse.success && likedResponse.data) {
            setIsLiked(likedResponse.data.isLiked)
          }
        }
      } catch (error) {
        console.error('Error cargando likes:', error)
      }
    }

    loadLikesData()
  }, [fullProduct?.id, isAuthenticated])

  // Función para toggle like
  const handleToggleLike = async () => {
    if (!isAuthenticated || !fullProduct?.id || isTogglingLike) return

    setIsTogglingLike(true)
    try {
      if (isLiked) {
        const response = await apiClient.delete<{ liked: boolean; likesCount: number }>(
          API_ENDPOINTS.PRODUCTS.UNLIKE(fullProduct.id)
        )
        if (response.success && response.data) {
          setIsLiked(false)
          setLikesCount(response.data.likesCount)
        }
      } else {
        const response = await apiClient.post<{ liked: boolean; likesCount: number }>(
          API_ENDPOINTS.PRODUCTS.LIKE(fullProduct.id)
        )
        if (response.success && response.data) {
          setIsLiked(true)
          setLikesCount(response.data.likesCount)
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setIsTogglingLike(false)
    }
  }

  if (isLoadingProduct || !fullProduct) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  const variants = fullProduct.variants || []
  const selectedVariant = variants[selectedVariantIndex] || variants[0]

  // Usar tankuPrice directamente (ya calculado en sync)
  const finalPrice = selectedVariant?.tankuPrice || 0
  const stock = selectedVariant?.stock || 0
  const maxQuantity = Math.min(stock, 10)

  // Obtener imágenes
  const images = fullProduct.images || []
  const allImages = fullProduct.thumbnail
    ? [fullProduct.thumbnail, ...images]
    : images.length > 0
    ? images
    : product.imageUrl
    ? [product.imageUrl]
    : []

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity)
    }
  }

  const handleAddToCart = async () => {
    if (!selectedVariant?.id || stock === 0 || isAddingToCart) return

    setIsAddingToCart(true)
    setError(null)

    try {
      await addItem(selectedVariant.id, quantity)
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (err: any) {
      setError(err?.message || 'Error al agregar al carrito')
      console.error('Error agregando al carrito:', err)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleBuyNow = async () => {
    if (!selectedVariant?.id || stock === 0) return

    setIsAddingToCart(true)
    setError(null)

    try {
      await addItem(selectedVariant.id, quantity)
      router.push('/cart') // Cambiar a carrito en lugar de checkout
    } catch (err: any) {
      setError(err?.message || 'Error al procesar compra')
      console.error('Error en comprar ahora:', err)
      setIsAddingToCart(false)
    }
  }

  const handleShare = () => {
    if (!product?.handle) return
    setShowShareModal(true)
  }

  const productTitle = fullProduct.title || product.title
  const productDescription = fullProduct.description || ''

  return (
    <div className={`${isPageView ? 'bg-gray-900 rounded-lg border border-gray-700' : ''}`}>
      {/* Lightbox para imagen ampliada */}
      {isImageLightboxOpen && allImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <button
            onClick={() => setIsImageLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 bg-gray-800 hover:bg-gray-700 rounded-full p-3 text-white transition-all shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-7xl max-h-full">
            <Image
              src={allImages[currentImageIndex]}
              alt={productTitle}
              width={1200}
              height={1200}
              className="max-w-full max-h-[90vh] object-contain"
              unoptimized={allImages[currentImageIndex].startsWith('http')}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8 p-6">
        {/* Galería de imágenes */}
        <div className="md:w-1/2 flex gap-4">
          {/* Miniaturas a la izquierda (solo en desktop) */}
          {allImages.length > 1 && (
            <div className="hidden md:flex flex-col gap-2 overflow-y-auto max-h-[600px] custom-scrollbar">
              {allImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    currentImageIndex === index
                      ? 'border-[#73FFA2] ring-2 ring-[#73FFA2] ring-offset-2 ring-offset-gray-900'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${productTitle} - ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized={img.startsWith('http')}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Imagen principal */}
          {allImages.length > 0 && (
            <div className="flex-1 relative">
              <div
                className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setIsImageLightboxOpen(true)}
              >
                <Image
                  src={allImages[currentImageIndex]}
                  alt={productTitle}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                  unoptimized={allImages[currentImageIndex].startsWith('http')}
                />
                {/* Botón "me gusta" discreto en la esquina superior derecha */}
                {isAuthenticated && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleLike()
                    }}
                    className="absolute top-2 right-2 p-2 bg-gray-900/70 hover:bg-gray-900/90 rounded-full backdrop-blur-sm transition-colors z-10"
                    title={isLiked ? 'Quitar me gusta' : 'Me gusta'}
                    disabled={isTogglingLike}
                  >
                    {isTogglingLike ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <HeartIcon className={`w-5 h-5 transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-300 hover:text-red-400'}`} />
                    )}
                  </button>
                )}
              </div>
              
              {/* Miniaturas abajo en móvil */}
              {allImages.length > 1 && (
                <div className="md:hidden flex gap-2 overflow-x-auto mt-4 pb-2">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        currentImageIndex === index
                          ? 'border-[#73FFA2] ring-2 ring-[#73FFA2]'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${productTitle} - ${index + 1}`}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized={img.startsWith('http')}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Información del producto */}
        <div className="md:w-1/2 space-y-6">
          {/* Header con título, wishlist y compartir */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{productTitle}</h1>
              {productDescription && (
                <p className="text-gray-400 text-lg">{productDescription}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Botón "me gusta" */}
              {isAuthenticated && (
                <button
                  onClick={handleToggleLike}
                  disabled={isTogglingLike}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                  title={isLiked ? 'Quitar me gusta' : 'Me gusta'}
                >
                  {isTogglingLike ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <HeartIcon className={`w-6 h-6 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                  )}
                </button>
              )}
              {/* Botón wishlist con BookmarkIcon */}
              {isAuthenticated && (
                <button
                  onClick={() => setShowWishlistModal(true)}
                  className="p-2 text-gray-400 hover:text-[#73FFA2] transition-colors"
                  title="Agregar a wishlist"
                >
                  <BookmarkIcon className="w-6 h-6" />
                </button>
              )}
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Compartir"
              >
                <ShareIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Precio */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[#73FFA2]">
              {formatPrice(finalPrice)}
            </span>
          </div>

          {/* Contador de likes */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleLike}
              disabled={!isAuthenticated || isTogglingLike}
              className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <HeartIcon className={`w-5 h-5 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
              <span className="text-sm font-medium">{likesCount}</span>
            </button>
          </div>

          {/* Selector de variantes */}
          {variants.length > 1 && (
            <VariantSelector
              variants={variants}
              selectedVariant={selectedVariant}
              onVariantChange={(variant) => {
                const index = variants.findIndex((v) => v.id === variant.id)
                setSelectedVariantIndex(index >= 0 ? index : 0)
                setQuantity(1)
              }}
              formatPrice={formatPrice}
            />
          )}

          {/* Stock */}
          {stock > 0 ? (
            <p className="text-green-400 text-sm">✓ {stock} disponibles</p>
          ) : (
            <p className="text-red-400 text-sm">✗ Agotado</p>
          )}

          {/* Cantidad */}
          {stock > 0 && (
            <div className="flex items-center gap-4">
              <label className="text-white font-medium">Cantidad:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="w-12 text-center text-white font-semibold">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= maxQuantity}
                  className="w-10 h-10 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Botones de acción */}
          {stock > 0 && isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={isAddingToCart || isCartLoading}
                className="flex-1 bg-[#73FFA2] hover:bg-[#60D489] text-gray-900 font-semibold py-3"
              >
                {isAddingToCart ? 'Agregando...' : 'Agregar al carrito'}
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={isAddingToCart || isCartLoading}
                className="flex-1 border-[#73FFA2] text-[#73FFA2] hover:bg-[#73FFA2] hover:text-gray-900 font-semibold py-3"
              >
                Comprar ahora
              </Button>
            </div>
          )}

          {!isAuthenticated && (
            <p className="text-gray-400 text-sm">
              Inicia sesión para agregar productos al carrito
            </p>
          )}
        </div>
      </div>

      {/* Modal de compartir */}
      {product?.handle && (
        <ShareProductModal
          isOpen={showShareModal}
          productUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/products/${product.handle}`}
          productTitle={fullProduct?.title}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Modal de wishlist */}
      {isAuthenticated && fullProduct && (
        <WishlistSelectorModal
          isOpen={showWishlistModal}
          onClose={() => setShowWishlistModal(false)}
          productId={fullProduct.id}
          variantId={selectedVariant?.id}
          onAdded={() => {
            setShowWishlistModal(false)
          }}
        />
      )}
    </div>
  )
}

