'use client'

import React, { useState, useRef, useEffect, memo, useCallback } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { ProductModal } from '@/components/products/product-modal'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { WishlistSelectorModal } from '@/components/wishlists/wishlist-selector-modal'
import { useWishLists } from '@/lib/hooks/use-wishlists'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { logger } from '@/lib/utils/logger'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import type { FeedItemDTO } from '@/types/api'
import { productHappinessLabel } from '@/lib/utils/product-happiness-label'

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
    isInWishlist?: boolean // Del feed optimizado
  }
  onOpenModal?: (product: any) => void
  onLikeUpdated?: (productId: string, updates: { isLiked: boolean; likesCount: number }) => void
  onWishlistUpdated?: (productId: string, updates: { isInWishlist: boolean }) => void
  isLightMode?: boolean
  isAboveFold?: boolean // ✅ Nuevo prop para indicar si está visible sin scroll
  isLanding?: boolean // ✅ Prop para indicar si es landing (oculta carrito y wishlist)
}

export const ProductCard = memo(function ProductCard({
  product,
  onOpenModal,
  onLikeUpdated,
  onWishlistUpdated,
  isLightMode = false,
  isAboveFold = false,
  isLanding = false,
}: ProductCardProps) {
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
  const [isInWishlist, setIsInWishlist] = useState(product.isInWishlist ?? false)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const hasUserToggledLike = useRef(false)
  const hasUserToggledWishlist = useRef(false)
  const previousProductIdRef = useRef<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  /** Ignorar «click» tras scroll/drag para no abrir el modal en móvil */
  const pointerDownRef = useRef<{ clientX: number; clientY: number } | null>(null)

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
      hasUserToggledLike.current = false
      hasUserToggledWishlist.current = false
      previousProductIdRef.current = currentProductId

      if (product.likesCount !== undefined) setLikesCount(product.likesCount)
      if (product.isLiked !== undefined) setIsLiked(product.isLiked)
      if (product.isInWishlist !== undefined) setIsInWishlist(product.isInWishlist)
    } else {
      if (!hasUserToggledLike.current) {
        if (product.likesCount !== undefined) setLikesCount(product.likesCount)
        if (product.isLiked !== undefined) setIsLiked(product.isLiked)
      }
      if (!hasUserToggledWishlist.current && product.isInWishlist !== undefined) {
        setIsInWishlist(product.isInWishlist)
      }
    }
  }, [product.id, product.isLiked, product.likesCount, product.isInWishlist])

  useEffect(() => {
    if (!isAuthenticated || hasUserToggledWishlist.current) return
    const inStore = wishLists.some((list) =>
      list.items?.some((item) => item.product?.id === product.id),
    )
    if (inStore) setIsInWishlist(true)
  }, [wishLists, product.id, isAuthenticated])

  useEffect(() => {
    const onWishlistEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ productId?: string }>).detail
      if (detail?.productId === product.id) {
        setIsInWishlist(true)
        hasUserToggledWishlist.current = true
        onWishlistUpdated?.(product.id, { isInWishlist: true })
      }
    }
    window.addEventListener('wishlistUpdated', onWishlistEvent)
    return () => window.removeEventListener('wishlistUpdated', onWishlistEvent)
  }, [product.id, onWishlistUpdated])


  // Manejar like/unlike
  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!isAuthenticated) {
      openProductModal()
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
          setIsLiked(false)
          setLikesCount(response.data.likesCount)
          onLikeUpdated?.(product.id, { isLiked: false, likesCount: response.data.likesCount })
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
          setIsLiked(true)
          setLikesCount(response.data.likesCount)
          onLikeUpdated?.(product.id, { isLiked: true, likesCount: response.data.likesCount })
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
      logger.error('Error toggling like:', error)
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

  const TAP_MOVE_THRESHOLD_PX = 14

  const isTouchUi = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches

  const openProductModal = useCallback(() => {
    if (onOpenModal) {
      onOpenModal(product)
    } else {
      setIsModalOpen(true)
    }
  }, [onOpenModal, product])

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      const down = pointerDownRef.current
      pointerDownRef.current = null

      if (down) {
        const dx = e.clientX - down.clientX
        const dy = e.clientY - down.clientY
        if (dx * dx + dy * dy > TAP_MOVE_THRESHOLD_PX * TAP_MOVE_THRESHOLD_PX) return
      } else if (isTouchUi()) {
        // Sin pointer/touch registrado en esta card: típico del «ghost click» tras scroll o eventos raros en móvil
        return
      }

      openProductModal()
    },
    [openProductModal]
  )

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Si no hay handle, no podemos obtener el producto completo
    if (!product.handle) {
      logger.warn('Producto no tiene handle, no se puede agregar al carrito')
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
        openProductModal()
      } else if (variants.length === 1) {
        // Si solo tiene una variante, agregar directamente al carrito
        await addItem(variants[0].id, 1)
        // Feedback visual: pequeño delay y luego reset
        await new Promise(resolve => setTimeout(resolve, 500))
      } else {
        throw new Error('El producto no tiene variantes disponibles')
      }
    } catch (error) {
      logger.error('Error agregando al carrito:', error)
      // Si falla, abrir el modal como fallback
      openProductModal()
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleAddToWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!isAuthenticated) {
      openProductModal()
      return
    }


    // Si no hay handle, no podemos obtener el producto completo
    if (!product.handle) {
      logger.warn('Producto no tiene handle, no se puede agregar a wishlist')
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
        openProductModal()
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
      logger.error('Error verificando producto para wishlist:', error)
      // Si falla, abrir el modal de producto como fallback
      openProductModal()
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
        likesCount: likesCount,
        isLiked: isLiked,
        isInWishlist: isInWishlist,
      } as FeedItemDTO)
    : null

  return (
    <div
      ref={cardRef}
      className="touch-manipulation bg-transparent overflow-visible cursor-pointer relative"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        pointerDownRef.current = { clientX: e.clientX, clientY: e.clientY }
      }}
      onTouchStart={(e) => {
        if (e.touches.length !== 1) return
        const t = e.touches[0]
        pointerDownRef.current = { clientX: t.clientX, clientY: t.clientY }
      }}
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
                if (process.env.NODE_ENV === 'development') {
                  console.warn('[ProductCard] Error cargando imagen:', product.imageUrl)
                }
                setImageError(true)
              }}
              unoptimized={
                isRemoteImageSrc(product.imageUrl) ||
                product.imageUrl?.includes('.gif') === true
              }
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
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Botón de me gusta - Siempre visible */}
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

          {/* Botón de wishlist - Solo si NO es landing */}
          {!isLanding && (
            <button
              className="bg-transparent hover:opacity-80 transition-opacity p-0.5 sm:p-1"
              onClick={handleAddToWishlist}
              title={isInWishlist ? 'En tu wishlist' : 'Agregar a wishlist'}
            >
              <Image
                src={
                  isInWishlist
                    ? '/icons_tanku/tanku_agregado_a_whislist_verde.svg'
                    : '/icons_tanku/tanku_agregar_a_whislist_azul.svg'
                }
                alt={isInWishlist ? 'En wishlist' : 'Agregar a wishlist'}
                width={24}
                height={24}
                className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6"
                style={{ width: 'clamp(12px, 2vw, 24px)', height: 'clamp(12px, 2vw, 24px)' }}
              />
            </button>
          )}

          {/* Botón de carrito - Solo si NO es landing */}
          {!isLanding && (
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
          )}
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
            {productHappinessLabel(likesCount)}
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

      {/* Modal de Producto (solo cuando la card controla su propio estado) */}
      {!onOpenModal && productForModal && (
        <ProductModal
          product={productForModal}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onProductUpdated={(_productId, updates) => {
            if (updates.isLiked !== undefined) {
              setIsLiked(updates.isLiked)
              hasUserToggledLike.current = true
            }
            if (updates.likesCount !== undefined) {
              setLikesCount(updates.likesCount)
            }
            if (updates.isInWishlist !== undefined) {
              setIsInWishlist(updates.isInWishlist)
              hasUserToggledWishlist.current = true
              onWishlistUpdated?.(product.id, { isInWishlist: updates.isInWishlist })
            }
          }}
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
            setIsInWishlist(true)
            hasUserToggledWishlist.current = true
            onWishlistUpdated?.(product.id, { isInWishlist: true })
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
    prevProps.product.isInWishlist === nextProps.product.isInWishlist &&
    prevProps.isLightMode === nextProps.isLightMode
  )
})

