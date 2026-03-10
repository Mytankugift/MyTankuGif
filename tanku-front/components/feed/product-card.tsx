'use client'

import React, { useState, useRef, useEffect, memo } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { ProductModal } from '@/components/products/product-modal'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { WishlistSelectorModal } from '@/components/wishlists/wishlist-selector-modal'
import { useWishLists } from '@/lib/hooks/use-wishlists'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { FeedItemDTO } from '@/types/api'

interface ProductCardProps {
  product: {
    id: string
    type: 'product'
    title: string
    imageUrl: string
    price?: number
    category?: {
      id: string
      name: string
      handle: string
    }
    handle?: string // Para navegación
    likesCount?: number // Del feed optimizado
    isLiked?: boolean // Del feed optimizado
  }
  onOpenModal?: (product: any) => void
  isLightMode?: boolean
  isAboveFold?: boolean // ✅ Nuevo prop para indicar si está visible sin scroll
}

export const ProductCard = memo(function ProductCard({ product, onOpenModal, isLightMode = false, isAboveFold = false }: ProductCardProps) {
  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  const { wishLists } = useWishLists()
  const [showTitle, setShowTitle] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined)
  const [imageError, setImageError] = useState(false)
  const [isLiked, setIsLiked] = useState(product.isLiked ?? false)
  const [likesCount, setLikesCount] = useState(product.likesCount ?? 0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const hasUserToggledLike = useRef(false) // Rastrear si el usuario hizo un cambio manual
  const previousProductIdRef = useRef<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Formatear precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Manejar hover para mostrar título después de 1 segundo
  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTitle(true)
    }, 1000)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setShowTitle(false)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])


  // Actualizar estado cuando cambian los props del feed
  // Solo actualizar si el usuario NO ha hecho cambios manuales o si cambió el producto
  useEffect(() => {
    // Si cambió el producto (ID diferente), resetear el flag y actualizar
    const currentProductId = product.id
    
    if (previousProductIdRef.current !== currentProductId) {
      // Es un producto nuevo, resetear todo
      hasUserToggledLike.current = false
      previousProductIdRef.current = currentProductId
      
      // Actualizar desde las props
      if (product.likesCount !== undefined) {
        setLikesCount(product.likesCount)
      }
      if (product.isLiked !== undefined) {
        setIsLiked(product.isLiked)
      }
    } else if (!hasUserToggledLike.current) {
      // Solo actualizar desde props si el usuario no ha hecho cambios manuales
      // Esto permite que el feed actualice los likes cuando se recarga
      if (product.likesCount !== undefined) {
        setLikesCount(product.likesCount)
      }
      if (product.isLiked !== undefined) {
        setIsLiked(product.isLiked)
      }
    }
    // Si hasUserToggledLike.current es true, NO actualizar desde props
    // para mantener los cambios del usuario
  }, [product.id, product.isLiked, product.likesCount]) // También escuchar cambios en isLiked y likesCount


  // Manejar like/unlike
  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!isAuthenticated) {
      setIsModalOpen(true) // Abrir modal para que se autentique
      return
    }

    if (isTogglingLike) return

    // Optimistic update: actualizar inmediatamente antes de la llamada API
    const previousLiked = isLiked
    const previousCount = likesCount
    const newLiked = !isLiked
    const newCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1)
    
    setIsLiked(newLiked)
    setLikesCount(newCount)
    hasUserToggledLike.current = true // Marcar que el usuario hizo un cambio

    setIsTogglingLike(true)
    try {
      if (previousLiked) {
        // Quitar like
        const response = await apiClient.delete<{ liked: boolean; likesCount: number }>(
          API_ENDPOINTS.PRODUCTS.UNLIKE(product.id)
        )
        if (response.success && response.data) {
          // Actualizar con el valor real del servidor
          setIsLiked(false)
          setLikesCount(response.data.likesCount)
        } else {
          // Si falla, revertir al estado anterior
          setIsLiked(previousLiked)
          setLikesCount(previousCount)
        }
      } else {
        // Dar like
        const response = await apiClient.post<{ liked: boolean; likesCount: number }>(
          API_ENDPOINTS.PRODUCTS.LIKE(product.id)
        )
        if (response.success && response.data) {
          // Actualizar con el valor real del servidor
          setIsLiked(true)
          setLikesCount(response.data.likesCount)
        } else {
          // Si el error es CONFLICT (ya le diste like), actualizar el estado a "liked"
          if (response.error?.code === 'CONFLICT' || response.error?.message?.includes('Ya le diste like')) {
            // El producto ya tiene like, sincronizar el estado
            setIsLiked(true)
            // Intentar obtener el conteo actual
            try {
              const likesResponse = await apiClient.get<{ likesCount: number }>(
                API_ENDPOINTS.PRODUCTS.LIKES_COUNT(product.id)
              )
              if (likesResponse.success && likesResponse.data) {
                setLikesCount(likesResponse.data.likesCount)
              }
            } catch (err) {
              // Si falla, mantener el conteo optimista
            }
          } else {
            // Si falla por otra razón, revertir al estado anterior
            setIsLiked(previousLiked)
            setLikesCount(previousCount)
          }
        }
      }
    } catch (error: any) {
      console.error('Error toggling like:', error)
      // Si el error es CONFLICT, actualizar el estado a "liked"
      if (error?.error?.code === 'CONFLICT' || error?.message?.includes('Ya le diste like')) {
        setIsLiked(true)
      } else {
        // Revertir al estado anterior si hay otro error
        setIsLiked(previousLiked)
        setLikesCount(previousCount)
      }
    } finally {
      setIsTogglingLike(false)
    }
  }

  const handleCardClick = () => {
    // Siempre abrir modal al hacer click en la card
    setIsModalOpen(true)
    // Si hay un callback, llamarlo también
    if (onOpenModal) {
      onOpenModal(product)
    }
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Si no hay handle, no podemos obtener el producto completo
    if (!product.handle) {
      console.warn('Producto no tiene handle, no se puede agregar al carrito')
      return
    }

    setIsAddingToCart(true)
    try {
      // Obtener producto completo para verificar si tiene variantes
      const fullProduct = await fetchProductByHandle(product.handle)
      
      if (!fullProduct) {
        throw new Error('No se pudo cargar el producto')
      }

      const variants = fullProduct.variants || []
      
      // Si tiene múltiples variantes, abrir el modal para que el usuario elija
      if (variants.length > 1) {
        setIsModalOpen(true)
      } else if (variants.length === 1) {
        // Si solo tiene una variante, agregar directamente al carrito
        await addItem(variants[0].id, 1)
        // Feedback visual: pequeño delay y luego reset
        await new Promise(resolve => setTimeout(resolve, 500))
      } else {
        throw new Error('El producto no tiene variantes disponibles')
      }
    } catch (error) {
      console.error('Error agregando al carrito:', error)
      // Si falla, abrir el modal como fallback
      setIsModalOpen(true)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleAddToWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!isAuthenticated) {
      setIsModalOpen(true)
      return
    }


    // Si no hay handle, no podemos obtener el producto completo
    if (!product.handle) {
      console.warn('Producto no tiene handle, no se puede agregar a wishlist')
      return
    }

    try {
      // Obtener producto completo para verificar variantes y stock
      const fullProduct = await fetchProductByHandle(product.handle)
      
      if (!fullProduct) {
        throw new Error('No se pudo cargar el producto')
      }

      const variants = fullProduct.variants || []
      
      // Si tiene múltiples variantes, abrir el modal de producto para que el usuario elija
      if (variants.length > 1) {
        setIsModalOpen(true)
        return
      } 
      
      // Si solo tiene una variante, validar stock antes de agregar
      if (variants.length === 1) {
        const variant = variants[0]
        if (variant.stock === 0) {
          alert('Este producto no tiene stock disponible')
          return
        }
        // Si tiene stock, abrir modal de wishlist con la variante seleccionada
        setSelectedVariantId(variant.id)
        setIsWishlistModalOpen(true)
      } else {
        throw new Error('El producto no tiene variantes disponibles')
      }
    } catch (error) {
      console.error('Error verificando producto para wishlist:', error)
      // Si falla, abrir el modal de producto como fallback
      setIsModalOpen(true)
    }
  }

  // Convertir producto del feed a FeedItemDTO para el modal
  const productForModal: FeedItemDTO | null = product.handle
    ? ({
        id: product.id,
        type: 'product' as const,
        title: product.title,
        imageUrl: product.imageUrl,
        price: product.price,
        category: product.category,
        createdAt: new Date().toISOString(),
        handle: product.handle,
      } as FeedItemDTO)
    : null

  return (
    <div
      ref={cardRef}
      className="bg-transparent overflow-visible cursor-pointer relative"
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: 'calc(100% - 4px)' }}
    >
      {/* Product Image */}
      <div
        className="w-full relative overflow-hidden"
        style={{ 
          width: '100%',
          borderTopLeftRadius: '25px',
          borderTopRightRadius: '25px',
          maxHeight: '400px',
          minHeight: 'auto',
        }}
      >
        <div className="w-full h-full overflow-hidden" style={{ borderTopLeftRadius: '25px', borderTopRightRadius: '25px' }}>
          {!imageError && product.imageUrl ? (
            <Image
              key={product.imageUrl}
              src={product.imageUrl}
              alt={product.title}
              width={300}
              height={400}
              className="w-full h-full object-cover object-center"
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'cover',
                borderTopLeftRadius: '25px',
                borderTopRightRadius: '25px',
              }}
              loading={isAboveFold ? "eager" : "lazy"}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 25vw"
              quality={85}
              onError={() => {
                console.warn('[ProductCard] Error cargando imagen:', product.imageUrl)
                setImageError(true)
              }}
              unoptimized={product.imageUrl?.includes('cloudfront.net') || product.imageUrl?.includes('.gif')}
              priority={isAboveFold}
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

        {/* Botones de acción (me gusta, wishlist y carrito) */}
        <div 
          className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 z-10 flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 rounded-full p-1 sm:p-1.5 md:p-2"
          style={{ backgroundColor: '#2C3137' }}
        >
          {/* Botón de me gusta */}
          <button
            className="bg-transparent hover:opacity-80 transition-opacity p-0.5 sm:p-1"
            onClick={handleToggleLike}
            disabled={isTogglingLike || !isAuthenticated}
            title={isLiked ? 'Quitar me gusta' : 'Me gusta'}
          >
            {isTogglingLike ? (
              <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Image
                src={isLiked ? "/icons_tanku/tanku_megusta_relleno.svg" : "/icons_tanku/tanku_megusta_lineas.svg"}
                alt={isLiked ? "Quitar me gusta" : "Me gusta"}
                width={24}
                height={24}
                className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6"
                style={{ width: 'clamp(12px, 2vw, 24px)', height: 'clamp(12px, 2vw, 24px)' }}
              />
            )}
          </button>

          {/* Botón de wishlist */}
          <button
            className="bg-transparent hover:opacity-80 transition-opacity p-0.5 sm:p-1"
            onClick={handleAddToWishlist}
            title="Agregar a wishlist"
          >
            <Image
              src="/icons_tanku/tanku_agregar_a_whislist_azul.svg"
              alt="Agregar a wishlist"
              width={24}
              height={24}
              className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6"
              style={{ width: 'clamp(12px, 2vw, 24px)', height: 'clamp(12px, 2vw, 24px)' }}
            />
          </button>

          {/* Botón de carrito */}
          <button
            className="bg-transparent hover:opacity-80 transition-opacity p-0.5 sm:p-1"
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            title="Agregar al carrito"
          >
            {isAddingToCart ? (
              <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Image
                src="/icons_tanku/tanku_agregar_a_cart_azul.svg"
                alt="Agregar al carrito"
                width={24}
                height={24}
                className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6"
                style={{ width: 'clamp(12px, 2vw, 24px)', height: 'clamp(12px, 2vw, 24px)' }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Contenedor de información */}
      <div 
        className="p-2 sm:p-2.5 md:p-3"
        style={{ 
          backgroundColor: '#2C3137',
          borderBottomLeftRadius: '25px',
          borderBottomRightRadius: '25px',
          marginTop: '4px' 
        }}
      >
        {/* Precio */}
        {product.price && (
          <div className="mb-2">
            <span
              className="text-lg sm:text-xl md:text-2xl font-medium text-[#3B9BC3]"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {formatPrice(product.price)}
            </span>
          </div>
        )}

        {/* Me gusta con contador y texto */}
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-2">
          <Image
            src={isLiked ? "/icons_tanku/tanku_megusta_relleno.svg" : "/icons_tanku/tanku_megusta_lineas.svg"}
            alt="Me gusta"
            width={16}
            height={16}
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4"
            style={{ width: 'clamp(12px, 1.5vw, 16px)', height: 'clamp(12px, 1.5vw, 16px)' }}
          />
          <span 
            className="text-[10px] sm:text-xs md:text-xs font-normal leading-tight"
            style={{ color: '#73FFA2' }}
          >
            {likesCount} personas son felices con este producto
          </span>
        </div>

        {/* Nombre del producto */}
        <h3
          className="text-xs sm:text-sm md:text-base font-normal line-clamp-2"
          style={{ color: '#66DEDB' }}
        >
          {product.title}
        </h3>
      </div>

      {/* Modal de Producto */}
      {productForModal && (
        <ProductModal
          product={productForModal}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Modal de Wishlist Selector */}
      {isAuthenticated && (
        <WishlistSelectorModal
          isOpen={isWishlistModalOpen}
          onClose={() => {
            setIsWishlistModalOpen(false)
            setSelectedVariantId(undefined)
          }}
          productId={product.id}
          variantId={selectedVariantId}
          onAdded={() => {
            setIsWishlistModalOpen(false)
            setSelectedVariantId(undefined)
          }}
        />
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian estas props
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.imageUrl === nextProps.product.imageUrl &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.likesCount === nextProps.product.likesCount &&
    prevProps.product.isLiked === nextProps.product.isLiked &&
    prevProps.isLightMode === nextProps.isLightMode
  )
})

