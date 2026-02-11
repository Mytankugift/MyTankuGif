'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useProduct } from '@/lib/hooks/use-product'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { VariantSelector } from '@/components/products/variant-selector'
import { HeartIcon } from '@heroicons/react/24/outline'
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
  const [showFullDescription, setShowFullDescription] = useState(false)

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

  // ✅ Seleccionar automáticamente la primera variante con stock > 0
  useEffect(() => {
    if (fullProduct?.variants && fullProduct.variants.length > 0) {
      // Buscar la primera variante con stock > 0
      const variantWithStockIndex = fullProduct.variants.findIndex(v => v.stock > 0)
      if (variantWithStockIndex !== -1 && variantWithStockIndex !== selectedVariantIndex) {
        setSelectedVariantIndex(variantWithStockIndex)
      } else if (variantWithStockIndex === -1) {
        // Si ninguna variante tiene stock, mantener la selección actual pero mostrar advertencia
        console.warn('Ninguna variante tiene stock disponible')
      }
    }
  }, [fullProduct?.variants, selectedVariantIndex])

  // ✅ Seleccionar automáticamente la primera variante con stock > 0
  useEffect(() => {
    if (fullProduct?.variants && fullProduct.variants.length > 0) {
      // Buscar la primera variante con stock > 0
      const variantWithStockIndex = fullProduct.variants.findIndex(v => v.stock > 0)
      if (variantWithStockIndex !== -1 && variantWithStockIndex !== selectedVariantIndex) {
        setSelectedVariantIndex(variantWithStockIndex)
      } else if (variantWithStockIndex === -1) {
        // Si ninguna variante tiene stock, mantener la selección actual pero mostrar advertencia
        console.warn('Ninguna variante tiene stock disponible')
      }
    }
  }, [fullProduct?.variants, selectedVariantIndex])

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
  // ✅ CORREGIR: Evitar duplicar thumbnail si ya está en images[0]
  const thumbnail = fullProduct.thumbnail
  const firstImage = images.length > 0 ? images[0] : null

  const allImages = thumbnail && thumbnail !== firstImage
    ? [thumbnail, ...images]  // Solo agregar thumbnail si es diferente
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
  
  // Calcular si la descripción tiene más de 3 líneas
  const descriptionLines = productDescription.split('\n').filter(line => line.trim().length > 0)
  const hasLongDescription = descriptionLines.length > 3 || productDescription.length > 200
  const displayDescription = showFullDescription 
    ? productDescription 
    : hasLongDescription 
      ? productDescription.substring(0, 200) + '...'
      : productDescription

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

      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          {/* Galería de imágenes */}
          <div className="md:w-1/2 flex gap-4">
          {/* Miniaturas a la izquierda (solo en desktop) - siempre reservar espacio */}
          <div className="hidden md:flex flex-col gap-2 overflow-y-auto max-h-[400px] custom-scrollbar w-16 flex-shrink-0">
            {allImages.length > 1 ? (
              allImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    currentImageIndex === index
                      ? 'border-[#66DEDB] ring-2 ring-[#66DEDB] ring-offset-2 ring-offset-[#2C3137]'
                      : 'border-gray-600 hover:border-gray-500'
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
              ))
            ) : (
              <div className="w-16 h-16"></div> // Espacio reservado
            )}
          </div>

          {/* Imagen principal - más pequeña */}
          {allImages.length > 0 && (
            <div className="flex-1 relative max-w-sm">
              <div
                className={`relative aspect-square bg-gray-800 rounded-lg overflow-hidden group ${
                  isPageView ? 'cursor-pointer' : 'cursor-default'
                }`}
                onClick={isPageView ? () => setIsImageLightboxOpen(true) : undefined}
              >
                <Image
                  src={allImages[currentImageIndex]}
                  alt={productTitle}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                  unoptimized={allImages[currentImageIndex].startsWith('http')}
                />
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
                          ? 'border-[#66DEDB] ring-2 ring-[#66DEDB]'
                          : 'border-gray-600 hover:border-gray-500'
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
          <div className="md:w-1/2 space-y-5">
          {/* Precio con iconos de wishlist y compartir */}
          <div className="flex items-center justify-between">
            <span 
              className="text-3xl font-semibold"
              style={{ color: '#3B9BC3' }}
            >
              {formatPrice(finalPrice)}
            </span>
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <button
                  onClick={() => setShowWishlistModal(true)}
                  disabled={!selectedVariant || selectedVariant.stock === 0}
                  className="p-2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  title={selectedVariant?.stock === 0 ? "Esta variante no tiene stock disponible" : "Agregar a wishlist"}
                  style={{ 
                    color: selectedVariant?.stock === 0 ? '#666' : undefined,
                    cursor: selectedVariant?.stock === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Image
                    src="/icons_tanku/tanku_agregar_a_whislist_azul.svg"
                    alt="Agregar a wishlist"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                    style={{ 
                      opacity: selectedVariant?.stock === 0 ? 0.5 : 1 
                    }}
                  />
                </button>
              )}
              <button
                onClick={handleShare}
                className="p-2 hover:opacity-80 transition-opacity"
                title="Compartir"
              >
                <Image
                  src="/icons_tanku/tanku_compartir_publicacion_verde.svg"
                  alt="Compartir"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </button>
              {isAuthenticated && stock > 0 && (
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || isCartLoading}
                  className="p-2 hover:opacity-80 transition-opacity disabled:opacity-50"
                  title="Agregar al carrito"
                >
                  <Image
                    src="/feed/Icons/Shopping_Cart_Green.png"
                    alt="Carrito"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                    unoptimized
                  />
                </button>
              )}
            </div>
          </div>

          {/* Me gusta con contador */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleLike}
              disabled={!isAuthenticated || isTogglingLike}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {isTogglingLike ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Image
                  src={isLiked ? "/icons_tanku/tanku_megusta_relleno.svg" : "/icons_tanku/tanku_megusta_lineas.svg"}
                  alt="Me gusta"
                  width={28}
                  height={28}
                  className="w-7 h-7"
                />
              )}
            </button>
            <span 
              className="text-base font-normal"
              style={{ color: '#73FFA2' }}
            >
              A {likesCount} personas este producto las hace feliz.
            </span>
          </div>

          {/* Stock */}
          {stock > 0 ? (
            <p 
              className="text-base font-medium"
              style={{ color: '#66DEDB' }}
            >
              {stock} unidades disponibles.
            </p>
          ) : (
            <p className="text-red-400 text-base">✗ Agotado</p>
          )}

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

          {/* Cantidad */}
          {stock > 0 && (
            <div className="flex items-center gap-4">
              <label 
                className="font-medium"
                style={{ color: '#66DEDB' }}
              >
                Cantidad:
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="w-10 h-10 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'transparent',
                    border: '2px solid #66DEDB',
                    borderRadius: '17px',
                    color: '#66DEDB'
                  }}
                >
                  -
                </button>
                <span 
                  className="w-12 text-center font-semibold"
                  style={{ color: '#66DEDB' }}
                >
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= maxQuantity}
                  className="w-10 h-10 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'transparent',
                    border: '2px solid #66DEDB',
                    borderRadius: '17px',
                    color: '#66DEDB'
                  }}
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
                onClick={handleBuyNow}
                disabled={isAddingToCart || isCartLoading}
                className="flex-1 font-semibold py-3"
                style={{ 
                  backgroundColor: '#3B9BC3',
                  color: '#2C3137',
                  borderRadius: '25px'
                }}
              >
                Comprar este Tanku
              </Button>
              <Button
                onClick={() => {
                  if (!selectedVariant?.id) return
                  router.push(`/checkout/gift-direct?variantId=${selectedVariant.id}&quantity=${quantity}`)
                }}
                disabled={isAddingToCart || isCartLoading || !selectedVariant?.id}
                className="flex-1 font-semibold py-3"
                style={{ 
                  backgroundColor: '#66DEDB',
                  color: '#2C3137',
                  borderRadius: '25px'
                }}
              >
                Regalar este Tanku
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
      </div>

      {/* Descripción debajo de la imagen principal */}
      {productDescription && (
        <div className="px-6 pb-6 w-full">
          <h3 
            className="text-lg font-semibold mb-2"
            style={{ color: '#66DEDB' }}
          >
            Descripción
          </h3>
          <div className="relative">
            <p 
              className={`text-gray-300 text-sm leading-relaxed whitespace-pre-wrap ${
                !showFullDescription && hasLongDescription ? 'line-clamp-3' : ''
              }`}
            >
              {displayDescription}
            </p>
            {hasLongDescription && !showFullDescription && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => setShowFullDescription(true)}
                  className="text-sm font-medium hover:underline"
                  style={{ color: '#3B9BC3' }}
                >
                  Ver más
                </button>
              </div>
            )}
            {hasLongDescription && showFullDescription && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => setShowFullDescription(false)}
                  className="text-sm font-medium hover:underline"
                  style={{ color: '#3B9BC3' }}
                >
                  Ver menos
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

