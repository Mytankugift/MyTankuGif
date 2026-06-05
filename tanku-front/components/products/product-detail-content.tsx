'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useProduct } from '@/lib/hooks/use-product'
import { useCartStore } from '@/lib/stores/cart-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useWishLists } from '@/lib/hooks/use-wishlists'
import { Button } from '@/components/ui/button'
import { VariantSelector } from '@/components/products/variant-selector'
import { HeartIcon } from '@heroicons/react/24/outline'
import { ShareProductModal } from './share-product-modal'
import { WishlistSelectorModal } from '@/components/wishlists/wishlist-selector-modal'
import { CategoryLoginModal } from '@/components/feed/category-login-modal'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { ProductDTO, FeedItemDTO } from '@/types/api'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import { productHappinessLabel } from '@/lib/utils/product-happiness-label'
import { isAgeRestrictedApiError } from '@/lib/api/error-codes'
import {
  ProductAgeRestricted,
  ProductAgeRestrictedModal,
} from '@/components/products/product-age-restricted'

interface ProductDetailContentProps {
  product: FeedItemDTO
  isPageView?: boolean
  /** Si el producto es +18 bloqueado (modal feed), cerrar el modal en lugar de router.back */
  onAgeRestrictedClose?: () => void
}

export function ProductDetailContent({
  product,
  isPageView = false,
  onAgeRestrictedClose,
}: ProductDetailContentProps) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const { addItem, isLoading: isCartLoading } = useCartStore()
  const { wishLists } = useWishLists()
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
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const initializedProductIdRef = React.useRef<string | null>(null)
  const productHandleRef = React.useRef<string | null>(null)
  const descriptionRef = React.useRef<HTMLDivElement>(null)
  const variantSelectorRef = React.useRef<HTMLDivElement>(null)

  // Cargar producto completo usando el hook (siempre, para mostrar descripciones, variantes, etc.)
  const { product: fullProduct, isLoading: isLoadingProduct, error: productError } = useProduct(
    product?.handle || null,
    { enabled: !!product?.handle } // Siempre cargar para mostrar toda la información
  )

  useEffect(() => {
    if (product?.handle) {
      // Solo resetear si cambió el handle del producto (producto diferente)
      const currentHandle = product.handle
      if (productHandleRef.current !== currentHandle) {
        setCurrentImageIndex(0)
        setSelectedVariantIndex(0)
        setQuantity(1)
        setError(null)
        initializedProductIdRef.current = null // Resetear cuando cambia el producto
        productHandleRef.current = currentHandle
      }
    }
  }, [product?.handle]) // Solo cuando cambia el handle, no cuando cambia cualquier propiedad del objeto

  // ✅ Seleccionar automáticamente la primera variante con stock > 0
  // SOLO cuando se carga el producto por primera vez (cuando cambia el ID del producto)
  // NO cuando cambian las variantes por referencia o después de agregar al carrito
  useEffect(() => {
    if (fullProduct?.id && fullProduct?.variants && fullProduct.variants.length > 0) {
      // Solo inicializar si es un producto diferente
      if (initializedProductIdRef.current !== fullProduct.id) {
        const variantWithStockIndex = fullProduct.variants.findIndex(v => v.stock > 0)
        if (variantWithStockIndex !== -1) {
          setSelectedVariantIndex(variantWithStockIndex)
        } else {
          // Si ninguna tiene stock, mantener índice 0
          setSelectedVariantIndex(0)
        }
        initializedProductIdRef.current = fullProduct.id // Marcar este producto como inicializado
      }
    }
  }, [fullProduct?.id]) // Solo cuando cambia el ID del producto, no cuando cambian las variantes

  // Cargar datos de likes (usar valores del feed si están disponibles)
  useEffect(() => {
    if (!fullProduct?.id) return

    // Si el producto viene del feed, usar esos valores iniciales
    if (product.likesCount !== undefined) {
      setLikesCount(product.likesCount)
    }
    if (product.isLiked !== undefined) {
      setIsLiked(product.isLiked)
    }

    // Solo hacer petición si no tenemos los datos del feed o si está autenticado y necesitamos verificar
    const needsLikesData = product.likesCount === undefined || (isAuthenticated && product.isLiked === undefined)
    
    if (needsLikesData) {
      const loadLikesData = async () => {
        try {
          // Solo cargar likesCount si no lo tenemos
          if (product.likesCount === undefined) {
            const likesResponse = await apiClient.get<{ likesCount: number }>(
              API_ENDPOINTS.PRODUCTS.LIKES_COUNT(fullProduct.id)
            )
            if (likesResponse.success && likesResponse.data) {
              setLikesCount(likesResponse.data.likesCount)
            }
          }

          // Solo cargar isLiked si está autenticado y no lo tenemos
          if (isAuthenticated && product.isLiked === undefined) {
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
    }
  }, [fullProduct?.id, isAuthenticated, product.likesCount, product.isLiked])

  // Verificar si el producto está en alguna wishlist
  useEffect(() => {
    if (!isAuthenticated || !fullProduct?.id || !wishLists || wishLists.length === 0) {
      setIsInWishlist(false)
      return
    }

    // Verificar si el producto está en alguna wishlist
    const productInWishlist = wishLists.some(wishlist =>
      wishlist.items?.some(item => item.product?.id === fullProduct.id)
    )
    setIsInWishlist(productInWishlist)
  }, [wishLists, fullProduct?.id, isAuthenticated])

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

  if (isLoadingProduct) {
    return (
      <div className="min-h-[62dvh] max-md:min-h-[68dvh] w-full animate-pulse p-4 sm:p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-[42dvh] rounded-2xl bg-[#20252B]" />
          <div className="space-y-3">
            <div className="h-7 w-2/3 rounded-xl bg-[#20252B]" />
            <div className="h-5 w-1/3 rounded-xl bg-[#20252B]" />
            <div className="h-20 w-full rounded-2xl bg-[#20252B]" />
            <div className="h-11 w-full rounded-2xl bg-[#20252B]" />
            <div className="h-11 w-full rounded-2xl bg-[#20252B]" />
          </div>
        </div>
      </div>
    )
  }

  if (productError && !fullProduct) {
    if (isAgeRestrictedApiError(productError)) {
      return (
        <ProductAgeRestricted
          isAuthenticated={isAuthenticated}
          onClose={onAgeRestrictedClose ?? (() => router.back())}
          variant="embedded"
        />
      )
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-red-400 mb-2">{productError.message || 'No se pudo cargar el producto'}</p>
        <p className="text-gray-500 text-sm">Intenta de nuevo más tarde.</p>
      </div>
    )
  }

  if (!fullProduct) {
    return (
      <div className="min-h-[62dvh] max-md:min-h-[68dvh] w-full animate-pulse p-4 sm:p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-[42dvh] rounded-2xl bg-[#20252B]" />
          <div className="space-y-3">
            <div className="h-7 w-2/3 rounded-xl bg-[#20252B]" />
            <div className="h-5 w-1/3 rounded-xl bg-[#20252B]" />
            <div className="h-20 w-full rounded-2xl bg-[#20252B]" />
            <div className="h-11 w-full rounded-2xl bg-[#20252B]" />
            <div className="h-11 w-full rounded-2xl bg-[#20252B]" />
          </div>
        </div>
      </div>
    )
  }

  const variants = fullProduct.variants || []
  // Asegurar que el índice sea válido
  const validIndex = selectedVariantIndex >= 0 && selectedVariantIndex < variants.length 
    ? selectedVariantIndex 
    : 0
  const selectedVariant = variants[validIndex] || variants[0]

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
  
  const descriptionLines = productDescription.split('\n').filter(line => line.trim().length > 0)
  const hasLongDescription = descriptionLines.length > 3 || productDescription.length > 200
  const displayDescription =
    isPageView || showFullDescription
      ? productDescription
      : hasLongDescription
        ? productDescription.substring(0, 200) + '...'
        : productDescription

  const showAgeGate = Boolean(
    fullProduct && productError && isAgeRestrictedApiError(productError)
  )
  const isFeedModal = !isPageView

  const thumbnailButtonClass = (index: number, compact = false) =>
    `flex-shrink-0 rounded-lg overflow-hidden border-2 bg-[#171B21] transition-all ${
      compact ? 'h-10 w-10 md:h-14 md:w-14' : 'h-12 w-12 sm:h-16 sm:w-16 md:h-14 md:w-14'
    } ${
      currentImageIndex === index
        ? 'border-[#66DEDB] ring-2 ring-[#66DEDB] ring-offset-2 ring-offset-[#171B21]'
        : 'border-gray-600 hover:border-gray-500'
    }`

  return (
    <div className="relative bg-[#171B21]">
      {showAgeGate && (
        <>
          <div className="absolute inset-0 z-[50] bg-black/25 backdrop-blur-[1px]" aria-hidden />
          <div className="absolute inset-0 z-[51] flex items-center justify-center p-3 sm:p-4">
            <div className="pointer-events-auto w-full max-w-md">
              <ProductAgeRestrictedModal
                isAuthenticated={isAuthenticated}
                onClose={onAgeRestrictedClose ?? (() => router.back())}
              />
            </div>
          </div>
        </>
      )}
      <div className={showAgeGate ? 'pointer-events-none select-none' : undefined}>
      {/* Lightbox para imagen ampliada */}
      {isImageLightboxOpen && allImages.length > 0 && !showAgeGate && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#171B21] p-4"
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
              unoptimized={isRemoteImageSrc(allImages[currentImageIndex])}
            />
          </div>
        </div>
      )}

      <div className={isFeedModal ? 'px-4 pb-4 pt-1 md:px-6 md:pb-6 md:pt-2' : 'px-6 pb-6 pt-2'}>
        <div className={`flex flex-col md:flex-row ${isFeedModal ? 'mb-4 gap-4 md:mb-6 md:gap-6' : 'mb-6 gap-6'}`}>
          {/* Galería de imágenes */}
          <div className={`flex min-w-0 md:w-1/2 ${isFeedModal ? 'gap-2.5 md:gap-4' : 'gap-4'}`}>
          {/* Miniaturas a la izquierda — en modal móvil columna más baja con scroll */}
          <div
            className={`tanku-modal-scrollbar custom-scrollbar flex flex-shrink-0 flex-col gap-1.5 overflow-x-hidden overflow-y-auto ${
              isFeedModal
                ? 'max-h-[5.5rem] w-10 md:max-h-[400px] md:w-20 md:min-w-[5rem] md:items-center md:gap-2'
                : 'max-h-[400px] w-12 sm:w-16 md:w-20 md:min-w-[5rem] md:items-center md:gap-2'
            }`}
          >
            {allImages.length > 1 ? (
              allImages.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentImageIndex(index)}
                  className={thumbnailButtonClass(index, isFeedModal)}
                >
                  <Image
                    src={img}
                    alt={`${productTitle} - ${index + 1}`}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized={isRemoteImageSrc(img)}
                  />
                </button>
              ))
            ) : (
              <div
                className={
                  isFeedModal
                    ? 'h-10 w-10 md:h-14 md:w-14'
                    : 'h-12 w-12 sm:h-16 sm:w-16 md:h-14 md:w-14'
                }
                aria-hidden
              />
            )}
          </div>

          {/* Imagen principal */}
          {allImages.length > 0 && (
            <div
              className={`relative min-w-0 flex-1 ${
                isFeedModal ? 'mx-auto w-full max-w-[12rem] md:mx-0 md:max-w-sm' : 'max-w-sm'
              }`}
            >
              <div
                className={`relative overflow-hidden rounded-lg bg-[#171B21] group ${
                  isFeedModal
                    ? 'aspect-square max-md:mx-auto max-md:h-[12rem] max-md:w-[12rem] max-md:max-w-full'
                    : 'aspect-square'
                } ${isPageView ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={isPageView ? () => setIsImageLightboxOpen(true) : undefined}
              >
                <Image
                  src={allImages[currentImageIndex]}
                  alt={productTitle}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                  unoptimized={isRemoteImageSrc(allImages[currentImageIndex])}
                />
              </div>
            </div>
          )}
        </div>

          {/* Información del producto */}
          <div className={`md:w-1/2 ${isFeedModal ? 'space-y-4 md:space-y-5' : 'space-y-5'}`}>
          {/* Precio con iconos de wishlist y compartir */}
          <div className="flex items-center justify-between">
            <span 
              className={`font-semibold ${isFeedModal ? 'text-2xl md:text-3xl' : 'text-3xl'}`}
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
                  title={selectedVariant?.stock === 0 ? "Esta variante no tiene stock disponible" : (isInWishlist ? "Ya está en wishlist" : "Agregar a wishlist")}
                  style={{ 
                    color: selectedVariant?.stock === 0 ? '#666' : undefined,
                    cursor: selectedVariant?.stock === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Image
                    src={isInWishlist ? "/icons_tanku/tanku_agregado_a_whislist_verde.svg" : "/icons_tanku/tanku_agregar_a_whislist_azul.svg"}
                    alt={isInWishlist ? "Ya está en wishlist" : "Agregar a wishlist"}
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
              onClick={() => {
                if (!isAuthenticated) {
                  setShowLoginModal(true)
                } else {
                  handleToggleLike()
                }
              }}
              disabled={isTogglingLike}
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
              className="text-xs sm:text-base font-normal"
              style={{ color: '#73FFA2' }}
            >
              {productHappinessLabel(likesCount)}
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
            <div ref={variantSelectorRef}>
              <VariantSelector
                variants={variants}
                selectedVariant={selectedVariant}
                onVariantChange={(variant) => {
                  // Encontrar el índice de la variante seleccionada
                  const variantIndex = variants.findIndex((v) => v.id === variant.id)
                  if (variantIndex !== -1) {
                    setSelectedVariantIndex(variantIndex)
                    setQuantity(1)
                    // Forzar re-render actualizando el estado
                    setCurrentImageIndex(0)
                    
                    // Scroll automático en móvil para ver el botón "Ver más" si existe
                    setTimeout(() => {
                      if (variantSelectorRef.current && typeof window !== 'undefined' && window.innerWidth < 768) {
                        variantSelectorRef.current.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'nearest',
                          inline: 'nearest'
                        })
                      }
                    }, 100)
                  }
                }}
                formatPrice={formatPrice}
              />
            </div>
          )}

          {/* Cantidad - Solo visible si está autenticado */}
          {stock > 0 && isAuthenticated && (
            <div className="flex items-center gap-4">
              <label 
                className="font-medium"
                style={{ color: '#66DEDB' }}
              >
                Cantidad:
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowLoginModal(true)
                    } else {
                      handleQuantityChange(quantity - 1)
                    }
                  }}
                  disabled={quantity <= 1 || !isAuthenticated}
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
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowLoginModal(true)
                    } else {
                      handleQuantityChange(quantity + 1)
                    }
                  }}
                  disabled={quantity >= maxQuantity || !isAuthenticated}
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
          {stock > 0 && (
            <div className="flex flex-row gap-2 sm:gap-4">
              {isAuthenticated ? (
                <>
                  <Button
                    onClick={() => {
                      if (!selectedVariant?.id) return
                      router.push(`/checkout/gift-direct?variantId=${selectedVariant.id}&quantity=${quantity}`)
                    }}
                    disabled={isAddingToCart || isCartLoading || !selectedVariant?.id}
                    className="flex-1 font-semibold py-2 sm:py-3 text-xs sm:text-base"
                    style={{ 
                      backgroundColor: '#66DEDB',
                      color: '#2C3137',
                      borderRadius: '25px',
                      boxShadow: '0px 4px 4px 0px #00000040 inset'
                    }}
                  >
                    Regalar TANKU
                  </Button>
                  <Button
                    onClick={handleBuyNow}
                    disabled={isAddingToCart || isCartLoading}
                    className="flex-1 font-semibold py-2 sm:py-3 text-xs sm:text-base"
                    style={{ 
                      backgroundColor: '#3B9BC3',
                      color: '#2C3137',
                      borderRadius: '25px',
                      boxShadow: '0px 4px 4px 0px #00000040 inset'
                    }}
                  >
                    Comprar TANKU
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setShowLoginModal(true)}
                    className="flex-1 font-semibold py-2 sm:py-3 text-xs sm:text-base"
                    style={{ 
                      backgroundColor: '#66DEDB',
                      color: '#2C3137',
                      borderRadius: '25px',
                      boxShadow: '0px 4px 4px 0px #00000040 inset'
                    }}
                  >
                    Regalar TANKU
                  </Button>
                  <Button
                    onClick={() => setShowLoginModal(true)}
                    className="flex-1 font-semibold py-2 sm:py-3 text-xs sm:text-base"
                    style={{ 
                      backgroundColor: '#3B9BC3',
                      color: '#2C3137',
                      borderRadius: '25px',
                      boxShadow: '0px 4px 4px 0px #00000040 inset'
                    }}
                  >
                    Comprar TANKU
                  </Button>
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Descripción debajo de la imagen principal */}
      {productDescription && (
        <div
          ref={descriptionRef}
          className={`w-full px-6 ${isPageView ? 'pb-6' : 'pb-4'}`}
          style={isPageView ? { paddingBottom: '40px' } : undefined}
        >
          <h3 
            className="text-lg font-semibold mb-2"
            style={{ color: '#66DEDB' }}
          >
            Descripción
          </h3>
          <div className="relative">
            <p 
              className={`text-gray-300 text-sm leading-relaxed whitespace-pre-wrap ${
                !isPageView && !showFullDescription && hasLongDescription
                  ? 'line-clamp-3 md:line-clamp-5 lg:line-clamp-3'
                  : ''
              }`}
            >
              {displayDescription}
            </p>
            {!isPageView && hasLongDescription && !showFullDescription && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    setShowFullDescription(true)
                    // Scroll automático en móvil para ver el botón "Ver menos" después de expandir
                    setTimeout(() => {
                      if (descriptionRef.current && typeof window !== 'undefined' && window.innerWidth < 1024) {
                        const button = descriptionRef.current.querySelector('button')
                        if (button) {
                          button.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'nearest',
                            inline: 'nearest'
                          })
                        }
                      }
                    }, 100)
                  }}
                  className="text-sm font-medium hover:underline"
                  style={{ color: '#3B9BC3' }}
                >
                  Ver más
                </button>
              </div>
            )}
            {!isPageView && hasLongDescription && showFullDescription && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    setShowFullDescription(false)
                    // Scroll automático en móvil para volver a la posición anterior
                    setTimeout(() => {
                      if (descriptionRef.current && typeof window !== 'undefined' && window.innerWidth < 1024) {
                        descriptionRef.current.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'start',
                          inline: 'nearest'
                        })
                      }
                    }, 100)
                  }}
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
          onAdded={async () => {
            setShowWishlistModal(false)
            // Actualizar estado después de agregar a wishlist
            setIsInWishlist(true)
          }}
        />
      )}

      {/* Modal de login para no autenticados */}
      <CategoryLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setShowLoginModal(false)
        }}
      />
      </div>
    </div>
  )
}

