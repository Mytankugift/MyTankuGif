'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { StoryDTO } from '@/lib/hooks/use-stories'
import { useAuthStore } from '@/lib/stores/auth-store'
import {
  getCachedWishlistStoryProduct,
  resolveWishlistStoryProduct,
  type WishlistStoryProduct,
} from '@/lib/stories/wishlist-story-product'
import { getProfileUrl } from '@/lib/utils/profile-url'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'

interface WishlistStoryCardProps {
  story: StoryDTO
  onClose: () => void
  /** El visor de historias espera esto antes de iniciar la barra de progreso */
  onMediaReady?: () => void
}

export function WishlistStoryCard({ story, onClose, onMediaReady }: WishlistStoryCardProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [product, setProduct] = useState<WishlistStoryProduct | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(story.variantId || null)
  const [imageError, setImageError] = useState(false)
  const mediaReadySentRef = useRef(false)

  const notifyMediaReady = useCallback(() => {
    if (mediaReadySentRef.current) return
    mediaReadySentRef.current = true
    onMediaReady?.()
  }, [onMediaReady])

  useEffect(() => {
    mediaReadySentRef.current = false
    setImageError(false)
    setIsLoading(true)
    setProduct(null)
  }, [story.id])

  const applyProduct = useCallback(
    (loaded: WishlistStoryProduct) => {
      setProduct(loaded)
      if (story.variantId) {
        setSelectedVariant(story.variantId)
      } else if (loaded.variants && loaded.variants.length > 0) {
        setSelectedVariant(loaded.variants[0].id)
      }
    },
    [story.variantId]
  )

  const loadProduct = async () => {
    if (!story.productId) {
      setIsLoading(false)
      return
    }

    const cached = getCachedWishlistStoryProduct(story.id)
    if (cached) {
      applyProduct(cached)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const loaded = await resolveWishlistStoryProduct(story)
      if (loaded) {
        applyProduct(loaded)
      }
    } catch (error) {
      console.error('Error cargando producto:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (story.productId) {
      void loadProduct()
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recargar al cambiar story/producto
  }, [story.id, story.productId, story.productHandle])

  const productImage =
    product?.images && product.images.length > 0 ? product.images[0] : story.files[0]?.fileUrl

  /** Sin imagen que cargar → listo en cuanto hay datos del producto */
  useEffect(() => {
    if (isLoading || !product) return
    if (!productImage || imageError) {
      notifyMediaReady()
    }
  }, [isLoading, product, productImage, imageError, notifyMediaReady])

  useEffect(() => {
    if (!isLoading && !product && story.productId) {
      notifyMediaReady()
    }
  }, [isLoading, product, story.productId, notifyMediaReady])

  const handleRegalarTanku = () => {
    if (!selectedVariant || !story.wishlistId) return

    // Navegar a checkout de gift direct con el producto
    const recipientId = story.userId // El dueño de la wishlist
    router.push(
      `/checkout/gift-direct?variantId=${selectedVariant}&recipientId=${recipientId}&quantity=1&source=wishlist_story&wishlistId=${story.wishlistId}`
    )
    onClose()
  }

  const handleVerWishlist = () => {
    if (!story.wishlistId || !story.userId) return

    const isOwnStory = user?.id === story.userId

    if (isOwnStory) {
      router.push('/wishlist?tab=mine')
    } else {
      const profileUrl = getProfileUrl({
        username: story.author.username,
        id: story.author.id,
      })
      const sep = profileUrl.includes('?') ? '&' : '?'
      router.push(`${profileUrl}${sep}tab=wishlists`)
    }
    onClose()
  }

  const handleVerProducto = () => {
    if (product?.handle) {
      router.push(`/products/${product.handle}`)
      onClose()
    }
  }

  if (isLoading || !product) {
    return (
      <div className="relative w-full max-w-sm h-full max-h-[600px] flex items-center justify-center bg-[#2C3137] rounded-[25px]">
        <div className="text-white">
          {isLoading ? 'Cargando producto...' : 'No se pudo cargar el producto'}
        </div>
      </div>
    )
  }

  const variant = product?.variants?.find((v: any) => v.id === selectedVariant)
  const price = variant?.price || variant?.tankuPrice || product?.price || 0
  const productTitle = product?.title || story.title || story.description?.replace(' agregado a tu wishlist', '') || 'Producto'
  const isOwnStory = Boolean(user?.id && story.userId && user.id === story.userId)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="relative w-full max-w-sm h-full max-h-[600px] flex flex-col bg-transparent overflow-visible pt-12">
      {/* Product Image - Replicando diseño de ProductCard */}
      <div
        className="w-full relative overflow-hidden flex-shrink-0"
        style={{ 
          width: '100%',
          borderTopLeftRadius: '25px',
          borderTopRightRadius: '25px',
          maxHeight: '280px',
          minHeight: 'auto',
        }}
      >
        <div className="w-full h-full overflow-hidden" style={{ borderTopLeftRadius: '25px', borderTopRightRadius: '25px' }}>
          {!imageError && productImage ? (
            <Image
              src={productImage}
              alt={productTitle}
              width={400}
              height={500}
              className="w-full h-full object-cover object-center"
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'cover',
                borderTopLeftRadius: '25px',
                borderTopRightRadius: '25px',
              }}
              unoptimized={
                isRemoteImageSrc(productImage) || productImage?.includes('.gif') === true
              }
              onLoad={() => notifyMediaReady()}
              onError={() => {
                console.warn('[WishlistStoryCard] Error cargando imagen:', productImage)
                setImageError(true)
                notifyMediaReady()
              }}
            />
          ) : (
            <div 
              className="w-full h-full bg-gray-700/50 flex items-center justify-center" 
              style={{ 
                width: '100%',
                height: '100%',
                minHeight: '300px',
                borderTopLeftRadius: '25px',
                borderTopRightRadius: '25px',
              }}
            >
              <span className="text-gray-500 text-sm">Sin imagen</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor de información - Replicando diseño de ProductCard */}
      <div 
        className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between"
        style={{ 
          backgroundColor: '#2C3137',
          borderBottomLeftRadius: '25px',
          borderBottomRightRadius: '25px',
          marginTop: '4px' 
        }}
      >
        {/* Precio */}
        {price > 0 && (
          <div className="mb-1.5">
            <span
              className="text-lg sm:text-xl font-medium text-[#3B9BC3]"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {formatPrice(price)}
            </span>
          </div>
        )}

        {/* Nombre del producto */}
        <h3
          className="text-xs sm:text-sm font-normal line-clamp-2 mb-3"
          style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}
        >
          {productTitle}
        </h3>

        {/* Botones de acción */}
        <div className="flex flex-col gap-2 mt-auto">
          <button
            onClick={handleRegalarTanku}
            className="w-full bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-black font-semibold py-2.5 px-4 rounded-full hover:shadow-lg hover:shadow-[#66DEDB]/25 transition-all duration-300 hover:transform hover:scale-105 text-sm"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Regalar Tanku
          </button>
          {product?.handle && (
            <button
              onClick={handleVerProducto}
              className="w-full bg-gray-700 text-white font-semibold py-2.5 px-4 rounded-full hover:bg-gray-600 transition-all duration-300 text-sm"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Ver Producto
            </button>
          )}
          <button
            onClick={handleVerWishlist}
            className="w-full bg-gray-700 text-white font-semibold py-2.5 px-4 rounded-full hover:bg-gray-600 transition-all duration-300 text-sm"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {isOwnStory
              ? 'Ver mis Wishlists'
              : `Ver Wishlist de ${story.author.firstName ?? 'usuario'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
