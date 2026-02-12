'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useStories, type StoryDTO } from '@/lib/hooks/use-stories'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { getProfileUrl } from '@/lib/utils/profile-url'

interface WishlistStoryCardProps {
  story: StoryDTO
  onClose: () => void
}

export function WishlistStoryCard({ story, onClose }: WishlistStoryCardProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(story.variantId || null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (story.productId) {
      loadProduct()
    } else {
      setIsLoading(false)
    }
  }, [story.productId, story.productHandle])

  const loadProduct = async () => {
    if (!story.productId) {
      setIsLoading(false)
      return
    }

    try {
      // Si tenemos el handle, usarlo directamente
      if (story.productHandle) {
        const fullProduct = await fetchProductByHandle(story.productHandle)
        if (fullProduct) {
          setProduct(fullProduct)
          if (story.variantId) {
            setSelectedVariant(story.variantId)
          } else if (fullProduct.variants && fullProduct.variants.length > 0) {
            setSelectedVariant(fullProduct.variants[0].id)
          }
          setIsLoading(false)
          return
        }
      }

      // Intentar obtener el producto por ID
      try {
        const response = await apiClient.get<any>(`/api/v1/products/${story.productId}`)
        if (response.success && response.data) {
          const foundProduct = response.data
          if (foundProduct.handle) {
            const fullProduct = await fetchProductByHandle(foundProduct.handle)
            if (fullProduct) {
              setProduct(fullProduct)
              if (story.variantId) {
                setSelectedVariant(story.variantId)
              } else if (fullProduct.variants && fullProduct.variants.length > 0) {
                setSelectedVariant(fullProduct.variants[0].id)
              }
              setIsLoading(false)
              return
            }
          }
        }
      } catch (error) {
        console.log('No se pudo obtener producto completo, usando información de la story')
      }

      // Fallback: usar información de la story
      const storyImage = story.files[0]?.fileUrl
      if (storyImage) {
        setProduct({
          id: story.productId,
          title: story.title || story.description?.replace(' agregado a tu wishlist', '') || 'Producto',
          images: [storyImage],
          variants: story.variantId
            ? [
                {
                  id: story.variantId,
                  price: 0,
                  title: 'Variante',
                },
              ]
            : [],
        })
        setSelectedVariant(story.variantId || null)
      }
    } catch (error) {
      console.error('Error cargando producto:', error)
    } finally {
      setIsLoading(false)
    }
  }

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

    // ✅ Si es mi propia historia, ir a mi perfil
    // Si es de otra persona, ir al perfil de esa persona usando username
    const isOwnStory = user?.id === story.userId
    
    if (isOwnStory) {
      // Ir a mi propio perfil
      router.push('/profile')
    } else {
      // Ir al perfil de la otra persona usando username
      const profileUrl = getProfileUrl({
        username: story.author.username,
        id: story.author.id,
      })
      router.push(profileUrl)
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
      <div className="relative w-full max-w-md h-full max-h-[90vh] flex items-center justify-center bg-[#2C3137] rounded-[25px]">
        <div className="text-white">Cargando producto...</div>
      </div>
    )
  }

  const productImage = product?.images && product.images.length > 0 ? product.images[0] : story.files[0]?.fileUrl
  const variant = product?.variants?.find((v: any) => v.id === selectedVariant)
  const price = variant?.price || variant?.tankuPrice || product?.price || 0
  const productTitle = product?.title || story.title || story.description?.replace(' agregado a tu wishlist', '') || 'Producto'

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="relative w-full max-w-md h-full max-h-[90vh] flex flex-col bg-transparent overflow-visible pt-16">
      {/* Product Image - Replicando diseño de ProductCard */}
      <div
        className="w-full relative overflow-hidden flex-shrink-0"
        style={{ 
          width: '100%',
          borderTopLeftRadius: '25px',
          borderTopRightRadius: '25px',
          maxHeight: '400px',
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
              unoptimized={productImage?.includes('cloudfront.net') || productImage?.includes('.gif')}
              onError={() => {
                console.warn('[WishlistStoryCard] Error cargando imagen:', productImage)
                setImageError(true)
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
        className="p-2 sm:p-2.5 md:p-3 flex-1 flex flex-col justify-between"
        style={{ 
          backgroundColor: '#2C3137',
          borderBottomLeftRadius: '25px',
          borderBottomRightRadius: '25px',
          marginTop: '4px' 
        }}
      >
        {/* Precio */}
        {price > 0 && (
          <div className="mb-2">
            <span
              className="text-lg sm:text-xl md:text-2xl font-medium text-[#3B9BC3]"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {formatPrice(price)}
            </span>
          </div>
        )}

        {/* Nombre del producto */}
        <h3
          className="text-xs sm:text-sm md:text-base font-normal line-clamp-2 mb-4"
          style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif' }}
        >
          {productTitle}
        </h3>

        {/* Botones de acción */}
        <div className="flex flex-col gap-3 mt-auto">
          <button
            onClick={handleRegalarTanku}
            className="w-full bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-black font-semibold py-3 px-6 rounded-full hover:shadow-lg hover:shadow-[#66DEDB]/25 transition-all duration-300 hover:transform hover:scale-105"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Regalar Tanku
          </button>
          {product?.handle && (
            <button
              onClick={handleVerProducto}
              className="w-full bg-gray-700 text-white font-semibold py-3 px-6 rounded-full hover:bg-gray-600 transition-all duration-300"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Ver Producto
            </button>
          )}
          <button
            onClick={handleVerWishlist}
            className="w-full bg-gray-700 text-white font-semibold py-3 px-6 rounded-full hover:bg-gray-600 transition-all duration-300"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Ver Wishlist de {story.author.firstName}
          </button>
        </div>
      </div>
    </div>
  )
}
