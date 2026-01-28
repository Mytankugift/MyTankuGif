'use client'

import React, { useState, useRef, useEffect, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { ProductModal } from '@/components/products/product-modal'
import { fetchProductByHandle } from '@/lib/hooks/use-product'
import { WishlistSelectorModal } from '@/components/wishlists/wishlist-selector-modal'
import { BookmarkIcon } from '@heroicons/react/24/outline'
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
}

export const ProductCard = memo(function ProductCard({ product, onOpenModal, isLightMode = false }: ProductCardProps) {
  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  const [showTitle, setShowTitle] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isLiked, setIsLiked] = useState(product.isLiked ?? false)
  const [likesCount, setLikesCount] = useState(product.likesCount ?? 0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
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
    setShowMenu(false)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Actualizar estado cuando cambian los props del feed
  // Esto asegura que cuando se recarga el feed, los likes se actualicen correctamente
  useEffect(() => {
    // Siempre actualizar cuando cambia el product.id (nuevo producto o recarga)
    // Actualizar likesCount si viene del feed
    if (product.likesCount !== undefined) {
      setLikesCount(product.likesCount)
    } else {
      // Si no viene del feed, mantener el estado actual
    }
    // Actualizar isLiked si viene del feed
    if (product.isLiked !== undefined) {
      setIsLiked(product.isLiked)
    } else {
      // Si no viene del feed, mantener el estado actual
    }
  }, [product.id, product.likesCount, product.isLiked])

  // Manejar like/unlike
  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!isAuthenticated) {
      setIsModalOpen(true) // Abrir modal para que se autentique
      return
    }

    if (isTogglingLike) return

    setIsTogglingLike(true)
    try {
      if (isLiked) {
        // Quitar like
        const response = await apiClient.delete<{ liked: boolean; likesCount: number }>(
          API_ENDPOINTS.PRODUCTS.UNLIKE(product.id)
        )
        if (response.success && response.data) {
          setIsLiked(false)
          setLikesCount(response.data.likesCount)
        }
      } else {
        // Dar like
        const response = await apiClient.post<{ liked: boolean; likesCount: number }>(
          API_ENDPOINTS.PRODUCTS.LIKE(product.id)
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

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

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
      className="bg-transparent overflow-visible cursor-pointer relative border-t border-l border-r border-gray-700/30 rounded-t-lg sm:rounded-t-2xl"
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Product Image - Ancho fijo para todas las cards */}
      <div
        className="w-full relative overflow-hidden rounded-t-lg sm:rounded-t-2xl"
        style={{ 
          width: '100%',
          // aspectRatio: '3/4', // Mantener proporción consistente (ancho:alto = 3:4)
          maxHeight: '400px', // Permitir que aspectRatio controle la altura
          minHeight: 'auto',
        }}
      >
        <div className="w-full h-full overflow-hidden rounded-t-lg sm:rounded-t-2xl">
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
              }}
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 25vw"
              quality={85}
              onError={() => {
                console.warn('[ProductCard] Error cargando imagen:', product.imageUrl)
                setImageError(true)
              }}
              unoptimized={product.imageUrl?.includes('cloudfront.net') || product.imageUrl?.includes('.gif')}
              priority={false}
            />
          ) : (
            <div 
              className="w-full h-full bg-gray-700/50 flex items-center justify-center rounded-t-lg sm:rounded-t-2xl" 
              style={{ 
                width: '100%',
                height: '100%',
                minHeight: '300px',
              }}
            >
              <span className="text-gray-500 text-sm">Sin imagen</span>
            </div>
          )}
        </div>

        {/* Botones de acción (carrito y like) */}
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-2">
          {/* Botón de like */}
          <button
            className={`${
              isLiked ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-800/80 hover:bg-gray-700/90'
            } rounded-full p-2 transition-all duration-300 backdrop-blur-sm`}
            onClick={handleToggleLike}
            disabled={isTogglingLike || !isAuthenticated}
            title={isLiked ? 'Quitar me gusta' : 'Me gusta'}
          >
            {isTogglingLike ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )}
          </button>

          {/* Botón de carrito */}
          <button
            className="bg-[#3B9BC3] hover:bg-[#3B9BC3] rounded-full px-2.5 py-1 transition-all duration-300 shadow-lg border-0"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(59, 155, 195, 0.3))',
              borderRadius: '20px',
            }}
            onClick={handleAddToCart}
            disabled={isAddingToCart}
          >
            {isAddingToCart ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Image
                src="/feed/Carrito 4.svg"
                alt="Add to cart"
                width={16}
                height={16}
                className="w-4 h-4"
                style={{
                  filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.5)) brightness(1.2)',
                }}
              />
            )}
          </button>
        </div>

        {/* Menú de 3 puntos */}
        <div className="absolute top-2 right-2 z-10">
          <div className="relative">
            <button
              className={`p-2 bg-gray-800/80 hover:bg-gray-700/90 rounded-full transition-all duration-300 backdrop-blur-sm ${
                showMenu ? 'scale-90 bg-gray-600/90' : 'scale-100'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>

            {/* Menú desplegable */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                  }}
                />
                <div
                  className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {product.handle && (
                    <Link
                      href={`/products/${product.handle}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(false)
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors"
                    >
                      Ir a publicación
                    </Link>
                  )}
                  {isAuthenticated && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(false)
                        setIsWishlistModalOpen(true)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors"
                    >
                      <BookmarkIcon className="w-4 h-4 inline mr-2" />
                      Agregar a wishlist
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contenedor de precio y likes */}
      <div className="p-2 sm:p-2.5 md:p-3 bg-gray-700/30">
        {/* Precio con corazón y contador de likes */}
        <div className="flex items-center gap-2 mb-1">
          {product.price && (
            <span
              className="text-sm sm:text-base md:text-xl font-bold text-[#3B9BC3]"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {formatPrice(product.price)}
            </span>
          )}
          <div className="flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-500"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-sm font-semibold text-gray-300">{likesCount}</span>
          </div>
        </div>

        {/* Nombre del producto */}
        <h3
          className={`text-xs sm:text-sm md:text-base font-normal line-clamp-2 ${
            isLightMode ? 'text-gray-800' : 'text-gray-300'
          }`}
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
          onClose={() => setIsWishlistModalOpen(false)}
          productId={product.id}
          onAdded={() => {
            // Opcional: mostrar feedback
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

