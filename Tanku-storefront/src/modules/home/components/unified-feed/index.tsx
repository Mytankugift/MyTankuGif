"use client"

import { Text, Button } from "@medusajs/ui"
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Image from "next/image"
import { Product } from "@modules/seller/components/table-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishListDropdown from "@modules/home/components/wish-list"
import { retrieveCustomer } from "@lib/data/customer"
import { fetchFeedPosts } from "../actions/get-feed-post"
import { togglePosterLike, getPosterReactions } from "../actions/poster-reactions"
import { getPosterComments, addPosterComment, editPosterComment, deletePosterComment, PosterComment } from "../actions/poster-comments"
import { Heart, MediaPlay, XMark, PencilSquare, Trash } from "@medusajs/icons"
import { fetchTankuProduct } from "@lib/data/product-tanku"
import { addToCart } from "@lib/data/cart"
import { useRegion } from "@lib/context/region-context"
import BlackFridayAd from "../black-friday-ad"

interface UnifiedFeedProps {
  products: Product[]
  customerId: string
  isFeatured?: boolean
  isLightMode?: boolean
  isLoading?: boolean
  PRODUCTS_PER_PAGE?: number
  hidePostersWhileLoading?: boolean // Ocultar posters mientras carga productos
}

interface Poster {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  avatar_url: string | null
  title: string
  description: string
  image_url: string | null
  video_url: string | null
  likes_count: number
  comments_count: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type FeedItem = {
  type: 'product' | 'poster' | 'banner'
  data: Product | Poster | { id: string, products: Product[] }
}

// Star rating component
const StarRating = ({ rating = 4.8 }: { rating?: number }) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0
  
  return (
    <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2">
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          return (
            <svg key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
          )
        } else if (i === fullStars && hasHalfStar) {
          return (
            <svg key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-yellow-400" viewBox="0 0 20 20">
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="currentColor"/>
                  <stop offset="50%" stopColor="transparent"/>
                </linearGradient>
              </defs>
              <path fill="url(#half)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
          )
        } else {
          return (
            <svg key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-gray-300" viewBox="0 0 20 20">
              <path fill="currentColor" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
          )
        }
      })}
      <span className="text-xs sm:text-sm text-gray-600 ml-0.5 sm:ml-1">{rating}</span>
    </div>
  )
}

// Skeleton Product Card (para carga, se integra con masonry)
const SkeletonProductCard = React.memo(() => {
  return (
    <div className="bg-transparent border-2 border-gray-600 rounded-lg sm:rounded-2xl p-2 sm:p-3 md:p-4 animate-pulse">
      {/* Star Rating Skeleton */}
      <div className="hidden sm:block mb-2 sm:mb-3 md:mb-4">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 bg-gray-600 rounded"></div>
          ))}
        </div>
      </div>
      
      {/* Product Image Skeleton */}
      <div className="w-full relative mb-2 sm:mb-3 md:mb-4 overflow-hidden rounded-lg bg-gray-700" style={{ maxHeight: '450px', minHeight: '200px', aspectRatio: '9/16' }}>
        <div className="w-full h-full bg-gray-600"></div>
      </div>
      
      {/* Product Title Skeleton */}
      <div className="mb-1 sm:mb-2">
        <div className="h-4 sm:h-5 md:h-6 bg-gray-600 rounded mb-1"></div>
        <div className="h-4 sm:h-5 md:h-6 bg-gray-600 rounded w-3/4"></div>
      </div>
      
      {/* Price and Action Buttons Skeleton */}
      <div className="flex justify-between items-center mb-2 sm:mb-3 md:mb-4">
        <div className="h-5 sm:h-6 md:h-7 bg-gray-600 rounded w-20"></div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gray-600 rounded-full"></div>
          <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gray-600 rounded-full"></div>
          <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gray-600 rounded-full"></div>
        </div>
      </div>
    </div>
  )
})

// Product Card Component (memoizado para evitar re-renders innecesarios)
const ProductCard = React.memo(({ product, onOpenModal, isAuthenticated, isLightMode = false }: { product: Product, onOpenModal: (product: Product) => void, isAuthenticated: boolean, isLightMode?: boolean }) => {
  const [showTitle, setShowTitle] = React.useState(false)
  const [showMenu, setShowMenu] = React.useState(false)
  const [isAddingToCart, setIsAddingToCart] = React.useState(false)
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const { region } = useRegion()
  
  // Usar suggestedPrice si existe, sino price. Los precios ya vienen en formato correcto (no centavos)
  const basePrice = product.variants?.[0]?.suggestedPrice || product.variants?.[0]?.price || product.variants?.[0]?.inventory?.price || 0
  // Aplicar incremento: (precio * 1.15) + 10,000
  const price = basePrice > 0 ? Math.round((basePrice * 1.15) + 10000) : 0
  const currencyCode = product.variants?.[0]?.inventory?.currency_code || 'COP'
  
  // Formatear el precio: usar $ para COP, o el código de moneda si es otro
  const formatPrice = (price: number, code: string) => {
    const formattedPrice = price.toLocaleString('es-CO', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })
    // Si es COP, usar solo el símbolo $
    if (code === 'COP') {
      return `$${formattedPrice}`
    }
    return `${code} ${formattedPrice}`
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

  // Limpiar timeout al desmontar
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Cerrar menú al hacer clic fuera
  React.useEffect(() => {
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
  
  return (
    <div 
      ref={cardRef}
      className="bg-transparent overflow-visible cursor-pointer relative border-t border-l border-r border-gray-700/30 rounded-t-lg sm:rounded-t-2xl"
      onClick={() => onOpenModal(product)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Product Image - Solo redondeada arriba */}
      <div className="w-full relative overflow-visible rounded-t-lg sm:rounded-t-2xl" style={{ maxHeight: '450px', minHeight: '200px' }}>
        <div className="w-full h-full overflow-hidden rounded-t-lg sm:rounded-t-2xl">
          <Image
            src={product.thumbnail || '/placeholder.png'}
            alt={product.title}
            width={400}
            height={450}
            className="w-full h-auto object-cover object-center"
            style={{ maxHeight: '450px', width: '100%', height: 'auto' }}
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            quality={85}
            unoptimized={(product.thumbnail || '').toLowerCase().endsWith('.gif')}
          />
        </div>
        
        {/* Botón de carrito sobre la imagen - esquina inferior derecha */}
        <div className="absolute bottom-2 right-2 z-10">
          <Button 
            className="bg-[#3B9BC3] hover:bg-[#3B9BC3] rounded-full px-2.5 py-1 transition-all duration-300 shadow-lg cart-button border-0"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(59, 155, 195, 0.3))',
              borderRadius: '20px',
            }}
            onClick={async (e) => {
              e.stopPropagation()
              
              // Efecto de brillo al hacer click
              const button = e.currentTarget
              button.style.filter = 'drop-shadow(0 6px 12px rgba(59, 155, 195, 0.6)) drop-shadow(0 0 20px rgba(59, 155, 195, 0.8)) brightness(1.3)'
              setTimeout(() => {
                button.style.filter = 'drop-shadow(0 2px 4px rgba(59, 155, 195, 0.3))'
              }, 300)
              
              // Verificar si tiene variaciones
              const hasVariations = product.variants && product.variants.length > 1
              
              if (hasVariations) {
                // Si tiene variaciones, abrir el modal
                onOpenModal(product)
              } else {
                // Si no tiene variaciones, agregar directamente al carrito
                const variant = product.variants?.[0]
                if (variant?.id) {
                  setIsAddingToCart(true)
                  try {
                    await addToCart({
                      variantId: variant.id,
                      quantity: 1,
                      countryCode: region?.countries?.[0]?.iso_2 || "co",
                    })
                    // Emitir evento para actualizar carrito inmediatamente después de que se complete
                    // Usar setTimeout para asegurar que la actualización del servidor se haya procesado
                    setTimeout(() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('cartUpdated'))
                      }
                    }, 100)
                  } catch (error) {
                    console.error("Error agregando al carrito:", error)
                  } finally {
                    setIsAddingToCart(false)
                  }
                }
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'drop-shadow(0 4px 8px rgba(59, 155, 195, 0.6)) drop-shadow(0 0 16px rgba(59, 155, 195, 0.8)) brightness(1.2)'
              e.currentTarget.style.backgroundColor = '#3B9BC3'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'drop-shadow(0 2px 4px rgba(59, 155, 195, 0.3))'
              e.currentTarget.style.backgroundColor = '#3B9BC3'
            }}
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
          </Button>
        </div>

        {/* Burbujas dinámicas para compartir y guardar */}
        <div className="absolute top-2 right-2 z-10">
          <div className="relative">
            {/* Botón principal de 3 puntos */}
            <Button
              className={`p-2 bg-gray-800/80 hover:bg-gray-700/90 rounded-full transition-all duration-300 backdrop-blur-sm ${showMenu ? 'scale-90 bg-gray-600/90' : 'scale-100'}`}
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <circle cx="12" cy="12" r="1"/>
                <circle cx="12" cy="5" r="1"/>
                <circle cx="12" cy="19" r="1"/>
              </svg>
            </Button>

            {/* Burbuja de Wishlist - Sale hacia la izquierda */}
            {isAuthenticated && (
              <div
                className={`absolute right-0 top-0 transition-all duration-500 ease-out ${
                  showMenu 
                    ? 'translate-x-[-60px] translate-y-0 opacity-100 scale-100' 
                    : 'translate-x-0 translate-y-0 opacity-0 scale-0 pointer-events-none'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative group">
                  <div className="absolute inset-0 bg-[#66DEDB] rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gray-800/90 backdrop-blur-sm rounded-full p-0 shadow-xl border border-[#66DEDB]/30 group-hover:border-[#66DEDB] transition-all overflow-hidden">
                    <div className="[&_button]:!rounded-full [&_button]:!p-2.5 [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!hover:bg-transparent">
                      <WishListDropdown productId={product.id} productTitle={product.title} />
                    </div>
                  </div>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm z-50" style={{ minWidth: 'max-content', whiteSpace: 'nowrap' }}>
                    Añadir a tu lista
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Burbuja de Compartir - Sale hacia abajo */}
            <div
              className={`absolute right-0 top-0 transition-all duration-500 ease-out ${
                showMenu 
                  ? 'translate-x-0 translate-y-[60px] opacity-100 scale-100' 
                  : 'translate-x-0 translate-y-0 opacity-0 scale-0 pointer-events-none'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(false)
                // TODO: Agregar funcionalidad de compartir
              }}
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-[#66DEDB] rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <button className="relative bg-gray-800/90 backdrop-blur-sm rounded-full p-2.5 shadow-xl border border-[#66DEDB]/30 group-hover:border-[#66DEDB] transition-all">
                  <Image src="/feed/arrow-right 4.svg" alt="Share" width={18} height={18} className="w-4.5 h-4.5" />
                </button>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm z-50" style={{ minWidth: 'max-content', whiteSpace: 'nowrap' }}>
                  Compartir
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenedor de precio y rating - Con fondo gris sutil */}
      <div className="p-2 sm:p-2.5 md:p-3 bg-gray-700/30">
        {/* Precio con estrella y rating al lado */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm sm:text-base md:text-xl font-bold text-[#3B9BC3]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {formatPrice(price, currencyCode)}
          </span>
          <div className="flex items-center gap-1">
            {/* Estrella única */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M9.87223 0L12.2028 7.38373H19.7447L13.6432 11.9471L15.9738 19.3309L9.87223 14.7675L3.77071 19.3309L6.10128 11.9471L-0.00024128 7.38373H7.54166L9.87223 0Z" fill="#FEF580"/>
            </svg>
            <span className="text-sm font-semibold text-[#FEF580]">4.8</span>
          </div>
        </div>
        
        {/* Nombre del producto - Debajo del precio con letra menos gruesa */}
        <h3 className={`text-xs sm:text-sm md:text-base font-normal mb-1 line-clamp-2 ${isLightMode ? 'text-gray-800' : 'text-gray-300'}`}>
          {product.title}
        </h3>
        
        {/* 20% OFF */}
        <div className="text-xs sm:text-sm font-semibold text-[#66DEDB]">
          20% OFF
        </div>
      </div>

    </div>
  )
}, (prevProps, nextProps) => {
  // Comparación personalizada para evitar re-renders innecesarios
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.thumbnail === nextProps.product.thumbnail &&
    prevProps.product.title === nextProps.product.title &&
    (prevProps.product.variants?.[0]?.suggestedPrice ?? prevProps.product.variants?.[0]?.price ?? prevProps.product.variants?.[0]?.inventory?.price ?? 0) === (nextProps.product.variants?.[0]?.suggestedPrice ?? nextProps.product.variants?.[0]?.price ?? nextProps.product.variants?.[0]?.inventory?.price ?? 0) &&
    prevProps.isAuthenticated === nextProps.isAuthenticated &&
    prevProps.isLightMode === nextProps.isLightMode
  )
})

// Modal Component for Poster Details
const PosterModal = ({ poster, isOpen, onClose, customerId }: { poster: Poster, isOpen: boolean, onClose: () => void, customerId: string }) => {
  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image')
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [likesCount, setLikesCount] = useState(poster.likes_count)
  const [isLiked, setIsLiked] = useState(false)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [comments, setComments] = useState<PosterComment[]>([])
  const [commentsCount, setCommentsCount] = useState(poster.comments_count)
  const [newComment, setNewComment] = useState("")
  const [isCommentLoading, setIsCommentLoading] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState("")
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [showReplies, setShowReplies] = useState<{[key: string]: boolean}>({})

  // Generar preview del video si existe
  useEffect(() => {
    if (poster.video_url && !poster.image_url) {
      const getVideoPreview = (videoUrl: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const video = document.createElement('video')
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Configurar CORS para evitar canvas tainted
          video.crossOrigin = 'anonymous'
          video.muted = true
          
          video.onloadeddata = () => {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            video.currentTime = 0.1
          }
          
          video.onseeked = () => {
            try {
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                resolve(canvas.toDataURL())
              } else {
                reject(new Error('No se pudo obtener el contexto del canvas'))
              }
            } catch (error) {
              // Si hay error de CORS, usar un placeholder
              console.warn('Error generando preview del video (posible problema de CORS):', error)
              resolve('/feed/video-placeholder.png')
            }
          }
          
          video.onerror = () => {
            console.warn('Error cargando video para preview')
            resolve('/feed/video-placeholder.png')
          }
          
          video.src = videoUrl
          video.load()
        })
      }

      getVideoPreview(poster.video_url)
        .then(setVideoPreview)
        .catch(() => setVideoPreview(null))
    }
  }, [poster.video_url, poster.image_url])

  // Inicializar activeMedia basado en el contenido disponible
  useEffect(() => {
    if (poster.image_url) {
      setActiveMedia('image')
    } else if (poster.video_url) {
      setActiveMedia('video')
    }
  }, [poster.image_url, poster.video_url])

  // Cargar estado inicial de likes y comentarios cuando se abre el modal
  useEffect(() => {
    if (isOpen && customerId) {
      setLikesCount(poster.likes_count)
      setCommentsCount(poster.comments_count)
      
      // Verificar si el usuario ya le dio like a este poster
      getPosterReactions(poster.id, customerId)
        .then((response) => {
          setIsLiked(!!response.user_reaction)
          setLikesCount(response.total_count)
        })
        .catch((error) => {
          console.error("Error loading poster reactions:", error)
        })

      // Cargar comentarios del poster
      getPosterComments(poster.id)
        .then((response) => {
          setComments(response.comments)
          setCommentsCount(response.total_count)
        })
        .catch((error) => {
          console.error("Error loading poster comments:", error)
        })
    }
  }, [isOpen, poster.id, customerId, poster.likes_count, poster.comments_count])

  // Manejar el mute/unmute del video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  // Función para manejar el toggle del like
  const handleLikeToggle = async () => {
    if (isLikeLoading || !customerId) return
    
    setIsLikeLoading(true)
    
    try {
      const result = await togglePosterLike(poster.id, customerId)
      
      // Actualizar el estado local
      setIsLiked(result.action === "added")
      setLikesCount(result.likes_count)
      
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setIsLikeLoading(false)
    }
  }

  // Función para agregar comentario
  const handleAddComment = async () => {
    if (isCommentLoading || !customerId || !newComment.trim()) return
    
    setIsCommentLoading(true)
    
    try {
      const result = await addPosterComment(poster.id, customerId, newComment.trim())
      
      // Actualizar la lista de comentarios
      setComments(prev => [...prev, result.comment])
      setCommentsCount(result.comments_count)
      setNewComment("")
      
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsCommentLoading(false)
    }
  }

  // Función para agregar respuesta
  const handleAddReply = async (parentId: string) => {
    if (isCommentLoading || !customerId || !replyContent.trim()) return
    
    setIsCommentLoading(true)
    
    try {
      const result = await addPosterComment(poster.id, customerId, replyContent.trim(), parentId)
      
      // Recargar comentarios para obtener la estructura actualizada
      const updatedComments = await getPosterComments(poster.id)
      setComments(updatedComments.comments)
      setCommentsCount(updatedComments.total_count)
      
      // Limpiar estado de respuesta
      setReplyingToId(null)
      setReplyContent("")
      
      // Mostrar automáticamente las respuestas del comentario padre
      setShowReplies(prev => ({ ...prev, [parentId]: true }))
      
    } catch (error) {
      console.error("Error adding reply:", error)
    } finally {
      setIsCommentLoading(false)
    }
  }

  // Función para iniciar respuesta
  const handleStartReply = (commentId: string) => {
    setReplyingToId(commentId)
    setReplyContent("")
  }

  // Función para cancelar respuesta
  const handleCancelReply = () => {
    setReplyingToId(null)
    setReplyContent("")
  }

  // Función para alternar visibilidad de respuestas
  const toggleReplies = (commentId: string) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }

  // Función para iniciar edición de comentario
  const handleStartEdit = (comment: PosterComment) => {
    setEditingCommentId(comment.id)
    setEditingCommentContent(comment.content)
  }

  // Función para cancelar edición
  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditingCommentContent("")
  }

  // Función para guardar edición de comentario
  const handleSaveEdit = async () => {
    if (!editingCommentId || !editingCommentContent.trim()) return
    
    try {
      const result = await editPosterComment(editingCommentId, editingCommentContent.trim())
      
      // Actualizar el comentario en la lista
      setComments(prev => prev.map(comment => 
        comment.id === editingCommentId ? result.comment : comment
      ))
      
      setEditingCommentId(null)
      setEditingCommentContent("")
      
    } catch (error) {
      console.error("Error editing comment:", error)
    }
  }

  // Función para eliminar comentario
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este comentario?")) return
    
    try {
      const result = await deletePosterComment(commentId)
      
      // Remover el comentario de la lista
      setComments(prev => prev.filter(comment => comment.id !== commentId))
      setCommentsCount(result.comments_count)
      
    } catch (error) {
      console.error("Error deleting comment:", error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-900 rounded-lg sm:rounded-2xl w-full max-w-7xl h-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col lg:flex-row relative">
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 bg-black bg-opacity-60 rounded-full p-1.5 sm:p-2 text-white hover:bg-opacity-80 transition-all"
        >
          <XMark className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Lado superior/izquierdo - Media */}
        <div className="w-full lg:w-1/2 h-64 sm:h-80 lg:h-full relative bg-black flex items-center justify-center flex-shrink-0">
          {(poster.image_url || poster.video_url) && (
            <>
              {/* Caso 1: Tiene imagen (con o sin video) */}
              {poster.image_url && (
                <div className={`w-full h-full relative ${activeMedia === 'image' ? 'block' : 'hidden'}`}>
                  <img
                    src={poster.image_url}
                    alt="Imagen de publicación"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              {/* Video */}
              {poster.video_url && (
                <div className={`w-full h-full relative ${activeMedia === 'video' ? 'block' : 'hidden'}`}>
                  <video
                    ref={videoRef}
                    src={poster.video_url}
                    className="w-full h-full object-contain"
                    controls
                    playsInline
                    loop
                    muted={isMuted}
                    autoPlay={activeMedia === 'video'}
                  />
                  
                  {/* Botón de mute/unmute */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-4 right-4 bg-black bg-opacity-60 rounded-full p-3 text-white hover:bg-opacity-80 transition-all"
                  >
                    {isMuted ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.617l3.766-2.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                        <path d="M15.536 14.536L13 12l2.536-2.536a1 1 0 111.414 1.414L14.414 13.5l2.536 2.536a1 1 0 01-1.414 1.414z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.617l3.766-2.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
              
              {/* Flechas de navegación si hay ambos medios */}
              {poster.image_url && poster.video_url && (
                <>
                  {/* Flecha izquierda */}
                  <button 
                    onClick={() => setActiveMedia('image')}
                    className={`absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 rounded-full p-2 hover:bg-opacity-80 transition-all ${activeMedia === 'video' ? 'visible' : 'invisible'}`}
                  >
                    <Image 
                      src="/feed/Flecha.svg"
                      alt="Anterior"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  </button>
                  
                  {/* Flecha derecha */}
                  <button 
                    onClick={() => setActiveMedia('video')}
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 rounded-full p-2 hover:bg-opacity-80 transition-all ${activeMedia === 'image' ? 'visible' : 'invisible'}`}
                  >
                    <Image 
                      src="/feed/Flecha.svg"
                      alt="Siguiente"
                      width={24}
                      height={24}
                      className="w-6 h-6 transform rotate-180"
                    />
                  </button>
                  
                  {/* Indicadores de posición */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    <div className={`w-2 h-2 rounded-full ${activeMedia === 'image' ? 'bg-[#73FFA2]' : 'bg-white bg-opacity-50'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${activeMedia === 'video' ? 'bg-[#73FFA2]' : 'bg-white bg-opacity-50'}`}></div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Lado inferior/derecho - Información del post */}
        <div className="w-full lg:w-1/2 p-3 sm:p-4 lg:p-6 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header del usuario - PRIMERO */}
          <div className="flex items-center mb-4 flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gray-700">
              <Image 
                src={poster.avatar_url || '/feed/avatar.png'}
                alt={poster.customer_name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="ml-3">
              <p className="text-white font-semibold text-sm sm:text-base">{poster.customer_name}</p>
              <p className="text-gray-400 text-xs sm:text-sm">
                {new Date(poster.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Título y descripción */}
          {poster.title && (
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 flex-shrink-0">{poster.title}</h2>
          )}
          
          {poster.description && (
            <p className="text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base flex-shrink-0">{poster.description}</p>
          )}

          {/* Sección de comentarios */}
          <div className="flex-1 flex flex-col min-h-0 mb-3 sm:mb-4">
            {/* Lista de comentarios */}
            <div className="flex-1 overflow-y-auto mb-3 sm:mb-4 pr-1 sm:pr-2" style={{maxHeight: 'calc(100vh - 400px)'}}>
              {comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      {/* Comentario principal */}
                      <div className="bg-gray-800 rounded-lg p-2 sm:p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2 flex-1">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                              <Image 
                                src={poster.avatar_url || '/feed/avatar.png'}
                                alt={comment.customer_name}
                                width={24}
                                height={24}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="text-white font-medium text-xs sm:text-sm">{comment.customer_name}</p>
                                <p className="text-gray-400 text-xs">
                                  {new Date(comment.created_at).toLocaleDateString('es-ES', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              {editingCommentId === comment.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editingCommentContent}
                                    onChange={(e) => setEditingCommentContent(e.target.value)}
                                    className="w-full bg-gray-700 text-white text-sm rounded p-2 resize-none"
                                    rows={2}
                                    maxLength={1000}
                                  />
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={handleSaveEdit}
                                      className="px-3 py-1 bg-[#73FFA2] text-black text-xs rounded hover:bg-[#5ee085] transition-colors"
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-500 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-gray-300 text-xs sm:text-sm break-words mb-1 sm:mb-2">{comment.content}</p>
                                  {/* Acciones del comentario */}
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => handleStartReply(comment.id)}
                                      className="text-xs text-gray-400 hover:text-[#73FFA2] transition-colors"
                                    >
                                      Responder
                                    </button>
                                    {comment.replies_count && comment.replies_count > 0 ? (
                                      <button
                                        onClick={() => toggleReplies(comment.id)}
                                        className="text-xs text-gray-400 hover:text-[#73FFA2] transition-colors"
                                      >
                                        {showReplies[comment.id] ? 'Ocultar' : 'Ver'} respuestas ({comment.replies_count})
                                      </button>
                                    ):<></>}
                                  </div>
                                  
                                </>
                              )}
                            </div>
                          </div>
                          {comment.customer_id === customerId && editingCommentId !== comment.id && (
                            <div className="flex space-x-1 ml-2 flex-shrink-0">
                              <button
                                onClick={() => handleStartEdit(comment)}
                                className="p-1 text-gray-400 hover:text-[#73FFA2] transition-colors"
                                title="Editar comentario"
                              >
                                <PencilSquare className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                title="Eliminar comentario"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Input para responder */}
                        {replyingToId === comment.id && (
                          <div className="mt-3 pl-8 border-l-2 border-gray-600">
                            <div className="flex space-x-2">
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                <Image 
                                  src={poster.avatar_url || '/feed/avatar.png'}
                                  alt="Tu avatar"
                                  width={24}
                                  height={24}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <div className="flex-1 space-y-2">
                                <textarea
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder="Escribe una respuesta..."
                                  className="w-full bg-gray-700 text-white text-sm rounded p-2 resize-none border border-gray-600 focus:border-[#73FFA2] focus:outline-none"
                                  rows={2}
                                  maxLength={1000}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      handleAddReply(comment.id)
                                    }
                                  }}
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleAddReply(comment.id)}
                                    disabled={isCommentLoading || !replyContent.trim()}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                      isCommentLoading || !replyContent.trim()
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-[#73FFA2] text-black hover:bg-[#5ee085]'
                                    }`}
                                  >
                                    {isCommentLoading ? '...' : 'Responder'}
                                  </button>
                                  <button
                                    onClick={handleCancelReply}
                                    className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-500 transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Respuestas anidadas */}
                      {comment.replies && comment.replies.length > 0 && showReplies[comment.id] && (
                        <div className="ml-8 space-y-2">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="bg-gray-750 rounded-lg p-3 border-l-2 border-[#73FFA2]">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-2 flex-1">
                                  <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                    <Image 
                                      src={poster.avatar_url || '/feed/avatar.png'}
                                      alt={reply.customer_name}
                                      width={20}
                                      height={20}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <p className="text-white font-medium text-xs">{reply.customer_name}</p>
                                      <p className="text-gray-400 text-xs">
                                        {new Date(reply.created_at).toLocaleDateString('es-ES', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                    <p className="text-gray-300 text-xs break-words">{reply.content}</p>
                                  </div>
                                </div>
                                {reply.customer_id === customerId && (
                                  <div className="flex space-x-1 ml-2 flex-shrink-0">
                                    <button
                                      onClick={() => handleStartEdit(reply)}
                                      className="p-1 text-gray-400 hover:text-[#73FFA2] transition-colors"
                                      title="Editar respuesta"
                                    >
                                      <PencilSquare className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                      title="Eliminar respuesta"
                                    >
                                      <Trash className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 text-sm py-8">
                  No hay comentarios aún. ¡Sé el primero en comentar!
                </div>
              )}
            </div>

            {/* Input para nuevo comentario */}
            <div className="border-t border-gray-700 pt-2 sm:pt-3 flex-shrink-0">
              <div className="flex space-x-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                  <Image 
                    src={poster.avatar_url || '/feed/avatar.png'}
                    alt="Tu avatar"
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1 flex space-x-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    className="flex-1 bg-gray-800 text-white text-xs sm:text-sm rounded-lg p-2 resize-none border border-gray-600 focus:border-[#73FFA2] focus:outline-none"
                    rows={2}
                    maxLength={1000}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddComment()
                      }
                    }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={isCommentLoading || !newComment.trim()}
                    className={`px-2 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                      isCommentLoading || !newComment.trim()
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-[#73FFA2] text-black hover:bg-[#5ee085]'
                    }`}
                  >
                    {isCommentLoading ? '...' : '→'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center space-x-3 sm:space-x-6 border-t border-gray-700 pt-2 sm:pt-3 flex-shrink-0">
            <button 
              onClick={handleLikeToggle}
              disabled={isLikeLoading}
              className={`flex items-center transition-colors ${
                isLiked 
                  ? 'text-[#73FFA2] hover:text-[#5FD687]' 
                  : 'text-[#3B82F6] hover:text-[#2563EB]'
              } ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Image 
                src={isLiked ? '/feed/Icons/Like_Green.png' : '/feed/Icons/Like_Blue.png'}
                alt="Like"
                width={20}
                height={20}
                className="mr-1 sm:mr-2 w-4 h-4 sm:w-6 sm:h-6"
              />
              <span>{likesCount}</span>
            </button>
            <div className="flex items-center text-gray-300">
              <span className="mr-1 sm:mr-2 text-sm sm:text-lg">💬</span>
              <span className="text-sm sm:text-base">{commentsCount}</span>
            </div>
            <button className="p-1 sm:p-2 hover:bg-gray-700 rounded-full transition-colors duration-200">
              <img src="/feed/arrow-right 4.svg" alt="Share" width="20" height="20" className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Poster Card Component (styled like product cards)
const PosterCard = ({ poster, onOpenModal, isLightMode = false }: { poster: Poster, onOpenModal: (poster: Poster) => void, isLightMode?: boolean }) => {
  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image')
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [isVideoVisible, setIsVideoVisible] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  
  // Inicializar activeMedia basado en el contenido disponible
  useEffect(() => {
    if (poster.image_url) {
      setActiveMedia('image')
    } else if (poster.video_url) {
      setActiveMedia('video')
    }
  }, [poster.image_url, poster.video_url])
  
  // IntersectionObserver para reproducir video solo cuando está visible
  useEffect(() => {
    if (!poster.video_url || activeMedia !== 'video') return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVideoVisible(true)
            // Reproducir video cuando está visible
            if (videoRef.current) {
              videoRef.current.play().catch((error) => {
                console.warn('Error al reproducir video automáticamente:', error)
              })
            }
          } else {
            setIsVideoVisible(false)
            // Pausar video cuando no está visible
            if (videoRef.current) {
              videoRef.current.pause()
        }
      }
        })
      },
      {
        threshold: 0.5, // Reproducir cuando al menos el 50% del video es visible
        rootMargin: '50px' // Empezar a cargar un poco antes de que sea visible
      }
    )
    
    if (cardRef.current) {
      observer.observe(cardRef.current)
      }
      
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current)
      }
    }
  }, [poster.video_url, activeMedia])
  
  // Manejar cuando el video está listo para reproducir
  const handleVideoReady = () => {
    if (videoRef.current && isVideoVisible && activeMedia === 'video') {
      videoRef.current.play().catch((error) => {
        console.warn('Error al reproducir video:', error)
      })
    }
  }
  
  // Reproducir video cuando se cambia a la vista de video
  useEffect(() => {
    if (activeMedia === 'video' && videoRef.current && isVideoVisible) {
      videoRef.current.play().catch((error) => {
        console.warn('Error al reproducir video al cambiar a vista de video:', error)
      })
    } else if (activeMedia === 'image' && videoRef.current) {
      videoRef.current.pause()
    }
  }, [activeMedia, isVideoVisible])
  
  // Actualizar el estado de mute del video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])
  
  // Función para toggle mute/unmute
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation() // Evitar que se abra el modal
    setIsMuted(!isMuted)
  }

  return (
    <div 
      ref={cardRef}
      className="bg-transparent border-2 border-[#73FFA2] rounded-lg sm:rounded-2xl p-2 sm:p-3 md:p-4 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
      onClick={() => onOpenModal(poster)}
    >
      {/* Poster Header */}
      <div className="flex items-center mb-2 sm:mb-3">
        <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full overflow-hidden bg-gray-700">
          <Image 
            src={poster.avatar_url || '/feed/avatar.png'}
            alt={poster.customer_name}
            width={32}
            height={32}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="ml-1.5 sm:ml-2">
          <p className={`font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-full ${isLightMode ? 'text-black' : 'text-white'}`}>{poster.customer_name}</p>
          <p className={`text-xs ${isLightMode ? 'text-gray-600' : 'text-gray-400'}`}>
            {new Date(poster.created_at).toLocaleDateString('es-ES', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
      
      {/* Poster Media */}
      <div className="w-full relative mb-2 sm:mb-3 md:mb-4 overflow-hidden rounded-lg">
        {(poster.image_url || poster.video_url) && (
          <>
            {/* Caso 1: Tiene imagen */}
            {poster.image_url && (
              <div className={`relative w-full overflow-hidden ${activeMedia === 'image' ? 'block' : 'hidden'}`} style={{ maxHeight: '500px', minHeight: '250px' }}>
                <Image
                  src={poster.image_url}
                  alt="Imagen de publicación"
                  width={400}
                  height={500}
                  className="w-full h-auto object-cover object-center"
                  style={{ maxHeight: '500px', width: '100%', height: 'auto' }}
                  unoptimized={poster.image_url.startsWith('blob:') || poster.image_url.startsWith('data:')}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                />
              </div>
            )}
            
            {/* Caso 2: Tiene video */}
            {poster.video_url && (
              <div className={`relative w-full bg-gray-800 flex items-center justify-center overflow-hidden ${activeMedia === 'video' ? 'block' : 'hidden'}`} style={{ maxHeight: '500px', minHeight: '250px' }}>
                <video
                  ref={videoRef}
                  src={poster.video_url}
                  className="w-full h-auto object-cover object-center"
                  style={{ maxHeight: '500px', width: '100%', height: 'auto' }}
                  muted={isMuted}
                  loop
                  playsInline
                  preload="metadata"
                  onLoadedData={handleVideoReady}
                  onCanPlay={handleVideoReady}
                />
                {/* Overlay sutil para indicar que es un video */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity duration-200 pointer-events-none" />
                
                {/* Botón de mute/unmute - solo aparece en videos */}
                <button
                  onClick={handleToggleMute}
                  className="absolute bottom-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-1.5 sm:p-2 transition-all duration-200 z-10"
                  aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {isMuted ? (
                    // Icono de mute (altavoz tachado)
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="w-4 h-4 sm:w-5 sm:h-5 text-white" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    // Icono de unmute (altavoz)
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="w-4 h-4 sm:w-5 sm:h-5 text-white" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
              </div>
            )}
            
            {/* Flechas de navegación si hay ambos medios */}
            {poster.image_url && poster.video_url && (
              <>
                {/* Flecha izquierda */}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation()
                    setActiveMedia('image')
                    // Pausar video al cambiar a imagen
                    if (videoRef.current) {
                      videoRef.current.pause()
                    }
                  }}
                  className={`absolute left-1 sm:left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 rounded-full p-1 sm:p-1.5 md:p-2 hover:bg-opacity-80 transition-all ${activeMedia === 'video' ? 'visible' : 'invisible'}`}
                >
                  <Image 
                    src="/feed/Flecha.svg"
                    alt="Anterior"
                    width={16}
                    height={16}
                    className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"
                  />
                </button>
                
                {/* Flecha derecha */}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation()
                    setActiveMedia('video')
                    // Reproducir video al cambiar a video
                    if (videoRef.current && isVideoVisible) {
                      videoRef.current.play().catch((error) => {
                        console.warn('Error al reproducir video:', error)
                      })
                    }
                  }}
                  className={`absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 rounded-full p-1 sm:p-1.5 md:p-2 hover:bg-opacity-80 transition-all ${activeMedia === 'image' ? 'visible' : 'invisible'}`}
                >
                  <Image 
                    src="/feed/Flecha.svg"
                    alt="Siguiente"
                    width={16}
                    height={16}
                    className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 transform rotate-180"
                  />
                </button>
                
                {/* Indicadores de posición */}
                <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 sm:space-x-2">
                  <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${activeMedia === 'image' ? 'bg-[#73FFA2]' : 'bg-white bg-opacity-50'}`}></div>
                  <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${activeMedia === 'video' ? 'bg-[#73FFA2]' : 'bg-white bg-opacity-50'}`}></div>
                </div>
              </>
            )}
          </>
        )}
      </div>
      
      {/* Poster Actions */}
      <div className="flex justify-between items-center mt-1 sm:mt-2">
        <button 
          className={`flex items-center hover:text-[#73FFA2] transition-colors ${isLightMode ? 'text-gray-700' : 'text-gray-300'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Heart className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 sm:mr-1.5 md:mr-2" />
          <span className={`text-xs sm:text-sm ${isLightMode ? 'text-black' : 'text-white'}`}>{poster.likes_count}</span>
        </button>
        <button 
          className="p-1 sm:p-1.5 md:p-2 hover:bg-gray-700 rounded-full transition-colors duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <img src="/feed/arrow-right 4.svg" alt="Share" width="16" height="16" className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  )
}

// Hook para calcular layout masonry puro
function useMasonryLayout(items: FeedItem[], containerRef: React.RefObject<HTMLDivElement | null>) {
  const [positions, setPositions] = useState<Array<{ top: number; left: number; width: number }>>([])
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const itemDimensions = useRef<Map<string, { width: number; height: number; aspectRatio: number }>>(new Map())
  const [columns, setColumns] = useState(2)
  const [gap, setGap] = useState(16)
  const [isCalculating, setIsCalculating] = useState(false)
  const previousItemsLengthRef = useRef(0)

  // Calcular número de columnas basado en el ancho de la pantalla
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      if (width < 640) {
        setColumns(2)
        setGap(4) // Gap pequeño para separación mínima
      } else if (width < 768) {
        setColumns(2)
        setGap(12)
      } else if (width < 1024) {
        setColumns(3)
        setGap(16)
      } else {
        setColumns(4)
        setGap(24)
      }
    }

    updateColumns()
    const handleResize = () => {
      updateColumns()
      // Forzar recálculo del masonry después de cambiar columnas
      setTimeout(() => {
        if (containerRef.current) {
          const event = new Event('resize')
          window.dispatchEvent(event)
        }
      }, 100)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calcular posiciones de los elementos después de que se rendericen
  const calculatePositions = useCallback(() => {
    if (!containerRef.current || items.length === 0) {
      setPositions([])
      return
    }

    // Preservar posición del scroll antes de recalcular SOLO si hay items previos
    // Si es la primera carga o se agregaron items (no se eliminaron), preservar scroll
    const scrollContainer = document.querySelector('.custom-scrollbar') as HTMLElement
    const hasExistingItems = previousItemsLengthRef.current > 0
    const isAddingItems = items.length > previousItemsLengthRef.current
    const savedScrollTop = (hasExistingItems && isAddingItems) ? (scrollContainer?.scrollTop || 0) : 0

    setIsCalculating(true)
    
    // Esperar múltiples frames para asegurar que los elementos estén renderizados y medibles
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const containerWidth = containerRef.current?.offsetWidth || 0
          if (containerWidth === 0) {
            setIsCalculating(false)
            return
          }

          const columnWidth = (containerWidth - (gap * (columns - 1))) / columns
          const columnHeights = new Array(columns).fill(0)
          const newPositions: Array<{ top: number; left: number; width: number }> = []

          items.forEach((item, index) => {
            if (!item || !item.type) {
              newPositions.push({ top: 0, left: 0, width: columnWidth })
              return
            }

            const itemKey = item.type === 'product' 
              ? `product-${(item.data as Product).id}-${index}`
              : `poster-${(item.data as Poster).id}-${index}`
            
            const element = itemRefs.current.get(itemKey)
            
            // Para productos, siempre 1 columna
            let itemColumns = 1
            let isWide = false
            
            // Para banners: el primero ocupa todo el ancho, los demás ocupan 2 columnas
            if (item.type === 'banner') {
              const bannerData = item.data as { id: string, products: Product[] }
              const isFirstBanner = bannerData.id === 'promo-banner-1'
              
              if (isFirstBanner) {
                // El primer banner ocupa TODAS las columnas (ancho completo)
                isWide = true
                itemColumns = columns
              } else {
                // Los banners siguientes ocupan 2 columnas (como promociones)
                isWide = columns >= 3
                itemColumns = columns >= 3 ? 2 : columns
              }
            } else if (item.type === 'poster' && columns >= 3) {
              // Para posters, decidir dinámicamente basándose en el contenido
              const poster = item.data as Poster
              let aspectRatio = 1 // Por defecto 1:1
              
              // Determinar si es video o imagen
              const hasVideo = !!poster.video_url
              const hasImage = !!poster.image_url
              const isVideo = hasVideo && (!hasImage || (hasImage && hasVideo)) // Si tiene video, es video
              
              // Intentar obtener dimensiones de la imagen o video
              if (element) {
                // Buscar imagen o video dentro del elemento
                const img = element.querySelector('img') as HTMLImageElement
                const video = element.querySelector('video') as HTMLVideoElement
                
                if (video && video.videoWidth && video.videoHeight) {
                  // Si es video, calcular aspect ratio
                  aspectRatio = video.videoHeight / video.videoWidth
                } else if (img && img.naturalWidth && img.naturalHeight && img.naturalWidth > 0) {
                  // Si es imagen, calcular aspect ratio usando dimensiones naturales
                  aspectRatio = img.naturalHeight / img.naturalWidth
                } else if (img && img.offsetWidth && img.offsetHeight && img.offsetWidth > 0) {
                  // Fallback: usar dimensiones renderizadas
                  aspectRatio = img.offsetHeight / img.offsetWidth
                }
              }
              
              // Decidir si ocupa 2 columnas:
              // - Si es video: siempre 1 columna (videos suelen ser más cuadrados y se ven mejor en 1 columna)
              // - Si es imagen muy alta (aspect ratio > 1.5): 2 columnas para aprovechar mejor el espacio
              // - Si es imagen normal o cuadrada: 1 columna
              const isVeryTall = aspectRatio > 1.5
              
              // Solo ocupar 2 columnas si es imagen muy alta (no videos)
              isWide = !isVideo && isVeryTall && columns >= 3
              itemColumns = isWide ? 2 : 1
            }
            
            // Calcular el ancho del item
            let itemWidth: number
            if (item.type === 'banner') {
              const bannerData = item.data as { id: string, products: Product[] }
              const isFirstBanner = bannerData.id === 'promo-banner-1'
              if (isFirstBanner) {
                itemWidth = containerWidth // Primer banner: ancho completo
              } else {
                itemWidth = columns >= 3 
                  ? (columnWidth * 2) + gap // Banners siguientes: 2 columnas
                  : containerWidth // En móviles: ancho completo
              }
            } else {
              itemWidth = isWide 
                ? (columnWidth * itemColumns) + (gap * (itemColumns - 1))
                : columnWidth
            }

            // Medir la altura real del elemento
            let itemHeight = item.type === 'banner' ? 420 : item.type === 'poster' ? 500 : 400 // Altura estimada por defecto
            if (element) {
              // Guardar todos los estilos originales
              const originalStyles = {
                position: element.style.position,
                visibility: element.style.visibility,
                opacity: element.style.opacity,
                top: element.style.top,
                left: element.style.left,
                width: element.style.width,
                height: element.style.height,
              }
              
              // Temporalmente hacer el elemento visible y medible (fuera de la vista)
              element.style.position = 'absolute'
              element.style.visibility = 'visible'
              element.style.opacity = '1'
              element.style.top = '-9999px'
              element.style.left = '0px'
              element.style.width = `${itemWidth}px`
              element.style.height = 'auto'
              
              // Forzar reflow para que el navegador calcule las dimensiones
              void element.offsetHeight
              
              // Medir la altura real usando múltiples métodos
              itemHeight = Math.max(
                element.offsetHeight || 0,
                element.scrollHeight || 0,
                element.getBoundingClientRect().height || 0,
                400 // fallback mínimo
              )
              
              // Restaurar estilos originales
              Object.keys(originalStyles).forEach(key => {
                element.style[key as any] = originalStyles[key as keyof typeof originalStyles] || ''
              })
            }

            // Encontrar la mejor posición para el item
            let startColumn = 0
            let minHeight = 0
            
            // Si el item ocupa todas las columnas disponibles, empezar desde la columna 0
            if (itemColumns >= columns) {
              startColumn = 0
              minHeight = Math.max(...columnHeights)
            } else if (itemColumns === 1) {
              // Para items de 1 columna, buscar la columna con menor altura
              minHeight = columnHeights[0]
              for (let i = 1; i < columns; i++) {
                if (columnHeights[i] < minHeight) {
                  minHeight = columnHeights[i]
                  startColumn = i
                }
              }
            } else {
              // Para items de 2+ columnas, buscar la posición donde el máximo de las columnas consecutivas sea el menor
              let bestMaxHeight = Infinity
              for (let i = 0; i <= columns - itemColumns; i++) {
                // Calcular la altura máxima de las columnas que ocupará este item
                let maxHeightInRange = 0
                for (let j = 0; j < itemColumns; j++) {
                  if (columnHeights[i + j] > maxHeightInRange) {
                    maxHeightInRange = columnHeights[i + j]
                  }
                }
                
                // Si esta posición tiene una altura máxima menor, es mejor
                if (maxHeightInRange < bestMaxHeight) {
                  bestMaxHeight = maxHeightInRange
                  startColumn = i
                  minHeight = maxHeightInRange
                }
              }
            }

            // Calcular posición
            const left = startColumn * (columnWidth + gap)
            // Para items de múltiples columnas, usar la altura máxima de las columnas afectadas
            const baseHeight = itemColumns > 1 
              ? Math.max(...Array.from({ length: itemColumns }, (_, i) => columnHeights[startColumn + i] || 0))
              : minHeight
            // Si baseHeight es 0 (primera fila), no agregar gap, sino agregar gap solo si hay elementos anteriores
            const top = baseHeight === 0 ? 0 : baseHeight + gap

            // Actualizar alturas de las columnas afectadas
            // Todas las columnas que ocupa el item deben tener la misma altura final
            const finalHeight = top + itemHeight
            for (let i = 0; i < itemColumns; i++) {
              if (startColumn + i < columns) {
                columnHeights[startColumn + i] = finalHeight
              }
            }

            newPositions.push({ top, left, width: itemWidth })
          })

          setPositions(newPositions)
          setIsCalculating(false)
          
          // Actualizar referencia de longitud de items
          previousItemsLengthRef.current = items.length
          
          // Restaurar posición del scroll después de recalcular posiciones
          // Solo restaurar si se están agregando items (no en la primera carga o al eliminar)
          if (hasExistingItems && isAddingItems && savedScrollTop > 0) {
            // Usar múltiples requestAnimationFrame para asegurar que el DOM esté actualizado
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (scrollContainer) {
                  // Verificar que el scroll aún no se haya movido (evitar conflictos)
                  const currentScroll = scrollContainer.scrollTop
                  if (Math.abs(currentScroll - savedScrollTop) > 50) {
                    // Solo restaurar si hay una diferencia significativa
                    scrollContainer.scrollTop = savedScrollTop
                  }
                }
              })
            })
          }
        })
      })
    })
  }, [items, columns, gap, containerRef])

  // Calcular posiciones cuando cambian los items o las columnas
  useEffect(() => {
    calculatePositions()
  }, [calculatePositions])

  // Recalcular cuando las imágenes se cargan
  useEffect(() => {
    if (items.length === 0) return

    const images = containerRef.current?.querySelectorAll('img')
    if (!images || images.length === 0) {
      // Esperar un poco más antes de calcular si no hay imágenes
      setTimeout(() => calculatePositions(), 100)
      return
    }

    let loadedCount = 0
    const totalImages = images.length

    const onImageLoad = () => {
      loadedCount++
      if (loadedCount === totalImages) {
        // Esperar un frame adicional después de que todas las imágenes se carguen
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            calculatePositions()
          })
        })
      }
    }

    images.forEach((img) => {
      if (img.complete) {
        loadedCount++
      } else {
        img.addEventListener('load', onImageLoad, { once: true })
        img.addEventListener('error', onImageLoad, { once: true })
      }
    })

    if (loadedCount === totalImages) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          calculatePositions()
        })
      })
    }

    return () => {
      images.forEach((img) => {
        img.removeEventListener('load', onImageLoad)
        img.removeEventListener('error', onImageLoad)
      })
    }
  }, [items, calculatePositions])

  // Usar ResizeObserver para recalcular cuando los elementos cambien de tamaño
  useEffect(() => {
    if (items.length === 0) return

    // También escuchar cambios de tamaño de ventana
    const handleWindowResize = () => {
      clearTimeout((window as any).masonryResizeTimeout)
      ;(window as any).masonryResizeTimeout = setTimeout(() => {
        calculatePositions()
      }, 150)
    }
    
    const observer = new ResizeObserver(() => {
      // Debounce para evitar demasiados recálculos
      clearTimeout((window as any).masonryResizeTimeout)
      ;(window as any).masonryResizeTimeout = setTimeout(() => {
        calculatePositions()
      }, 100)
    })
    
    window.addEventListener('resize', handleWindowResize)

    // Observar todos los elementos del masonry
    itemRefs.current.forEach((element) => {
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handleWindowResize)
      clearTimeout((window as any).masonryResizeTimeout)
    }
  }, [items, calculatePositions])

  return { positions, itemRefs, columns, gap, isCalculating }
}

// Variant Selector Component (similar to CategorySelector)
const VariantSelector = ({ 
  variants, 
  selectedVariant, 
  onVariantChange,
  formatPrice,
  basePrice,
  currencyCode
}: { 
  variants: any[]
  selectedVariant: any | null
  onVariantChange: (variant: any) => void
  formatPrice: (price: number, code: string) => string
  basePrice: number
  currencyCode: string
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const sortedVariants = [...variants].sort((a: any, b: any) => {
    const titleA = (a.title || '').toLowerCase()
    const titleB = (b.title || '').toLowerCase()
    return titleA.localeCompare(titleB)
  })

  const selectedVariantTitle = selectedVariant?.title || sortedVariants[0]?.title || 'Seleccionar variante'

  return (
    <div className="relative inline-block w-full" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-left transition-all duration-200 flex items-center justify-between hover:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB] focus:ring-opacity-20"
        >
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 mb-1">Variante seleccionada:</span>
            <span className="text-sm font-semibold text-[#66DEDB]">{selectedVariantTitle}</span>
          </div>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="12" 
            viewBox="0 0 20 12" 
            fill="none"
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M2 2L10 10L18 2" stroke="#66DEDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-gray-800 border-2 border-[#66DEDB] rounded-lg shadow-2xl z-50 p-3 max-h-64 overflow-y-auto variant-selector-scrollbar">
          {sortedVariants.map((variant: any, index: number) => {
            const isSelected = selectedVariant?.id === variant.id
            // Usar suggestedPrice si está disponible, sino price. Aplicar incremento (15% + $10,000)
            const baseVariantPrice = variant.suggestedPrice || variant.price || variant.inventory?.price || 0
            const variantPrice = baseVariantPrice > 0 ? Math.round((baseVariantPrice * 1.15) + 10000) : 0
            
            return (
              <button
                key={variant.id || index}
                onClick={() => {
                  onVariantChange(variant)
                  setIsOpen(false)
                }}
                className={`w-full mb-2 last:mb-0 px-4 py-3 rounded-lg transition-all duration-200 text-left border-2 ${
                  isSelected
                    ? "bg-[#66DEDB]/20 border-[#66DEDB]"
                    : "bg-gray-700/50 border-transparent hover:bg-gray-700 hover:border-[#66DEDB]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isSelected ? 'text-[#66DEDB]' : 'text-gray-300'}`}>
                    {variant.title || `Variante ${index + 1}`}
                  </span>
                  {variantPrice > 0 && (
                    <span className="text-xs text-gray-400 ml-2">
                      {formatPrice(variantPrice, currencyCode)}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <div className="mt-1 text-xs text-[#66DEDB] opacity-75">✓ Seleccionada</div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Product Modal Component
const ProductModal = ({ product, isOpen, onClose, isAuthenticated }: { product: Product | null, isOpen: boolean, onClose: () => void, isAuthenticated: boolean }) => {
  const [fullProduct, setFullProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const { region } = useRegion()

  useEffect(() => {
    if (isOpen && product) {
      setLoading(true)
      setImagesLoaded(false)
      setCurrentImageIndex(0)
      setSelectedVariant(null)
      setQuantity(1)
      // Cargar información completa del producto
      fetchTankuProduct(product.handle)
        .then((fullProductData) => {
          setFullProduct(fullProductData || product)
          // Seleccionar primera variante por defecto
          if (fullProductData?.variants && fullProductData.variants.length > 0) {
            setSelectedVariant(fullProductData.variants[0])
          }
        })
        .catch((error) => {
          console.error("Error cargando producto completo:", error)
          setFullProduct(product) // Usar el producto básico si falla
          if (product.variants && product.variants.length > 0) {
            setSelectedVariant(product.variants[0])
          }
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, product])

  // Esperar a que todas las imágenes se carguen
  useEffect(() => {
    if (!isOpen || loading || !product) {
      setImagesLoaded(false)
      return
    }

    const displayProduct = fullProduct || product
    if (!displayProduct) {
      setImagesLoaded(true)
      return
    }

    const images = (displayProduct as any).images || []
    const allImages = displayProduct.thumbnail 
      ? [displayProduct.thumbnail, ...images.map((img: any) => img?.url || img)] 
      : images.map((img: any) => img?.url || img)

    if (allImages.length === 0) {
      setImagesLoaded(true)
      return
    }

    let loadedCount = 0
    const totalImages = allImages.length
    const imageElements: HTMLImageElement[] = []

    const checkAllLoaded = () => {
      loadedCount++
      if (loadedCount === totalImages) {
        // Esperar un poco más para asegurar que todo esté renderizado
        setTimeout(() => {
          setImagesLoaded(true)
        }, 300)
      }
    }

    allImages.forEach((imageUrl: string) => {
      const img = document.createElement('img')
      img.onload = checkAllLoaded
      img.onerror = checkAllLoaded // Contar errores también para no bloquear
      img.src = imageUrl
      imageElements.push(img)
    })

    // Timeout de seguridad: si después de 3 segundos no se cargaron todas, mostrar igual
    const timeout = setTimeout(() => {
      setImagesLoaded(true)
    }, 3000)

    return () => {
      imageElements.forEach(img => {
        img.onload = null
        img.onerror = null
      })
      clearTimeout(timeout)
    }
  }, [isOpen, loading, fullProduct, product])

  if (!isOpen || !product) return null

  const displayProduct = fullProduct || product
  const variants = displayProduct.variants || []
  const activeVariant = selectedVariant || variants[0]
  // Usar suggestedPrice si está disponible, sino price. Aplicar incremento (15% + $10,000)
  const basePrice = activeVariant?.suggestedPrice || activeVariant?.price || activeVariant?.inventory?.price || 0
  const price = basePrice > 0 ? Math.round((basePrice * 1.15) + 10000) : 0
  const currencyCode = activeVariant?.inventory?.currency_code || 'COP'
  const stock = activeVariant?.inventory?.quantity_stock || 0
  const maxQuantity = Math.min(stock, 10) // Máximo 10 unidades o el stock disponible
  
  // Las imágenes pueden venir en diferentes formatos, manejamos ambos casos
  const images = (displayProduct as any).images || []
  const allImages = displayProduct.thumbnail 
    ? [displayProduct.thumbnail, ...images.map((img: any) => img?.url || img)] 
    : images.map((img: any) => img?.url || img)

  const formatPrice = (price: number, code: string) => {
    const formattedPrice = price.toLocaleString('es-CO', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })
    if (code === 'COP') {
      return `$${formattedPrice}`
    }
    return `${code} ${formattedPrice}`
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity)
    }
  }

  const handleAddToCart = async () => {
    if (!activeVariant?.id || stock === 0) return

    setIsAddingToCart(true)
    try {
      await addToCart({
        variantId: activeVariant.id,
        quantity: quantity,
        countryCode: region?.countries?.[0]?.iso_2 || "co",
      })
      // Emitir evento para actualizar carrito inmediatamente después de que se complete
      // Usar setTimeout para asegurar que la actualización del servidor se haya procesado
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cartUpdated'))
        }
      }, 100)
      // Opcional: mostrar notificación de éxito
    } catch (error) {
      console.error("Error agregando al carrito:", error)
    } finally {
      setIsAddingToCart(false)
    }
  }

  return (
    <React.Fragment>
      {/* Lightbox para imagen */}
      {isImageLightboxOpen && allImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <button
            onClick={() => setIsImageLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 bg-gray-800 hover:bg-gray-700 rounded-full p-3 text-white transition-all shadow-lg"
          >
            <XMark className="w-6 h-6" />
          </button>
          <div className="relative max-w-7xl max-h-[95vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Image
              src={allImages[currentImageIndex]}
              alt={displayProduct.title}
              width={1200}
              height={1600}
              className="max-w-full max-h-full object-contain"
              unoptimized
            />
            {allImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-800 hover:bg-gray-700 rounded-full p-3 text-white transition-all z-10"
                >
                  <Image src="/feed/Flecha.svg" alt="Anterior" width={24} height={24} className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-800 hover:bg-gray-700 rounded-full p-3 text-white transition-all z-10"
                >
                  <Image src="/feed/Flecha.svg" alt="Siguiente" width={24} height={24} className="w-6 h-6 transform rotate-180" />
                </button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10" onClick={(e) => e.stopPropagation()}>
                  {allImages.map((_: string, index: number) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-[#66DEDB]' : 'bg-white bg-opacity-50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Modal principal */}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
        <div className="bg-gray-900 rounded-lg sm:rounded-2xl w-full max-w-6xl h-full max-h-[95vh] sm:max-h-[92vh] overflow-hidden flex flex-col relative" onClick={(e) => e.stopPropagation()}>
          {/* Botón de cerrar integrado */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-gray-800 hover:bg-red-600 rounded-full p-2.5 text-white transition-all shadow-lg hover:scale-110"
            aria-label="Cerrar"
          >
            <XMark className="w-5 h-5" />
          </button>

          {/* Loading mientras se cargan las imágenes */}
          {(!imagesLoaded || loading) && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-[#66DEDB] border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-4 border-[#73FFA2] border-t-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <p className="text-[#66DEDB] text-sm font-medium">Cargando producto...</p>
              </div>
            </div>
          )}

          <div className={`flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden pt-4 transition-opacity duration-300 ${imagesLoaded && !loading ? 'opacity-100' : 'opacity-0'}`}>
            {/* Columna izquierda - Imagen + Descripción (más grande - 60%) */}
            <div className="w-full lg:w-[60%] lg:flex-shrink-0 flex flex-row min-h-0 border-r border-gray-700">
              {/* Miniaturas de imágenes al lado izquierdo */}
              {allImages.length > 1 && (
                <div className="flex flex-col gap-2 p-2 overflow-y-auto scrollbar-hide">
                  {allImages.map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex(index)
                      }}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                        index === currentImageIndex
                          ? 'border-[#66DEDB] ring-2 ring-[#66DEDB] ring-opacity-50'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${displayProduct.title} - Imagen ${index + 1}`}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
              
              {/* Contenedor de imagen y descripción */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Imagen principal - clickeable para abrir en grande - ocupa un poco más de la mitad (55%) */}
                <div className="flex-[0.55] min-h-[55%] relative bg-gray-800 flex items-center justify-center flex-shrink-0 cursor-pointer group" onClick={() => setIsImageLightboxOpen(true)}>
              {loading ? (
                <div className="animate-pulse flex space-x-4">
                  <div className="rounded-full bg-gray-700 h-12 w-12"></div>
                </div>
              ) : allImages.length > 0 ? (
                <>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all z-10 flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-black bg-opacity-60 px-4 py-2 rounded-lg">
                      Click para ampliar
                    </span>
                  </div>
                  <Image
                    src={allImages[currentImageIndex]}
                    alt={displayProduct.title}
                    width={500}
                    height={600}
                    className="w-full h-full object-contain p-4"
                    unoptimized
                  />
                </>
              ) : (
                <div className="text-gray-400 text-sm">No hay imagen disponible</div>
              )}
                </div>
                
                {/* Descripción debajo de la imagen - ocupa el resto del espacio */}
                {displayProduct.description && (
                  <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto bg-gray-800 bg-opacity-50 min-h-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-3">Descripción</h3>
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                      {displayProduct.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha - Información del producto (más pequeña - 40%) */}
            <div className="w-full lg:w-[40%] lg:flex-shrink-0 p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col min-h-0 overflow-hidden">
              {/* Header con título */}
              <div className="mb-4 mt-8">
                <h1 className="text-xl sm:text-2xl font-bold text-[#66DEDB]">{displayProduct.title}</h1>
              </div>
            
            {/* Precio */}
            <div className="text-3xl sm:text-4xl font-bold text-[#66DEDB] mb-6">
              {formatPrice(price, currencyCode)}
            </div>
            
            {/* Stock y Wishlist */}
            <div className="mb-5 pb-4 border-b border-gray-700">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Stock disponible:</span>
                  <span className={`text-base font-semibold ${stock > 0 ? 'text-[#66DEDB]' : 'text-red-400'}`}>
                    {stock > 0 ? `${stock} unidades` : 'Sin stock'}
                  </span>
                </div>
                {isAuthenticated && (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="flex-shrink-0 relative group"
                    title="Agregar a wishlist"
                  >
                    <WishListDropdown productId={displayProduct.id} productTitle={displayProduct.title} />
                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                      Agregar a wishlist
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Variantes */}
            {variants.length > 1 && (
              <div className="mb-6">
                <VariantSelector
                  variants={variants}
                  selectedVariant={selectedVariant}
                  onVariantChange={(variant: any) => {
                    setSelectedVariant(variant)
                    setQuantity(1) // Resetear cantidad al cambiar variante
                  }}
                  formatPrice={formatPrice}
                  basePrice={price}
                  currencyCode={currencyCode}
                />
              </div>
            )}
            
            {/* Selector de cantidad */}
            {stock > 0 && (
              <div className="mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-300 whitespace-nowrap">Cantidad</label>
                  <div className="flex gap-2">
                    {Array.from({ length: Math.min(5, maxQuantity) }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        onClick={() => handleQuantityChange(num)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium border-2 transition-all flex items-center justify-center ${
                          quantity === num
                            ? 'border-[#66DEDB] bg-[#66DEDB] bg-opacity-20 text-[#66DEDB]'
                            : 'border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Acciones */}
            <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-gray-700 flex-shrink-0">
              <Button 
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddToCart()
                }}
                className="w-full bg-[#66DEDB] hover:bg-[#5accc9] text-black font-semibold py-3.5 text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={stock === 0 || isAddingToCart}
                isLoading={isAddingToCart}
              >
                {isAddingToCart ? 'Agregando...' : stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
              </Button>
              {stock > 0 && (
                <Button
                  onClick={async (e) => {
                    e.stopPropagation()
                    try {
                      // Agregar al carrito
                      await addToCart({
                        variantId: selectedVariant.id,
                        quantity: 1,
                        countryCode: region?.countries?.[0]?.iso_2 || "co",
                      })
                      // Emitir evento para actualizar carrito inmediatamente después de que se complete
                      // Usar setTimeout para asegurar que la actualización del servidor se haya procesado
                      setTimeout(() => {
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('cartUpdated'))
                        }
                      }, 100)
                      
                      // Redirigir al checkout
                      window.location.href = '/checkout'
                    } catch (error) {
                      console.error("Error in buy now:", error)
                    }
                  }}
                  className="w-full bg-[#73FFA2] hover:bg-[#66e68f] text-black font-semibold py-3.5 text-base transition-all"
                >
                  Comprar ahora
                </Button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </React.Fragment>
  )
}

export default function UnifiedFeed({ products, customerId, isFeatured = false, isLightMode = false, isLoading = false, PRODUCTS_PER_PAGE = 50, hidePostersWhileLoading = false }: UnifiedFeedProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [posters, setPosters] = useState<Poster[]>([])
  const [loading, setLoading] = useState(true)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null)
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { positions, itemRefs, columns, gap, isCalculating } = useMasonryLayout(feedItems, containerRef)
  
  // OPTIMIZACIÓN: Banner estático que no se recarga al cambiar categoría
  // Como en ML/Amazon, el banner permanece igual independientemente de la categoría
  const staticBannerData = useMemo(() => ({
    id: 'promo-banner-1',
    products: [] // Banner no necesita productos específicos
  }), [])
  
  // Refs para evitar llamadas recurrentes cuando no hay sesión
  const hasCheckedAuthRef = useRef(false)
  const hasFetchedPostersRef = useRef(false)
  const lastCustomerIdRef = useRef<string | null>(null)
  const lastRenderLogRef = useRef<string>('')
  const lastFeedItemsCountRef = useRef<number>(0)
  
  useEffect(() => {
    const checkAuth = async () => {
      if (hasCheckedAuthRef.current) return
      hasCheckedAuthRef.current = true
      
      const customer = await retrieveCustomer().catch(() => null)
      setIsAuthenticated(!!customer)
    }
    
    checkAuth()
  }, [])

  useEffect(() => {
    // Si no hay customerId y ya procesamos este caso, no hacer nada
    if (!customerId) {
      if (!hasFetchedPostersRef.current) {
        setLoading(false)
        setPosters([])
        hasFetchedPostersRef.current = true
      }
      return
    }
    
    // Si el customerId no cambió, no hacer nada
    if (lastCustomerIdRef.current === customerId && hasFetchedPostersRef.current) {
      return
    }
    
    // Solo hacer fetch si hay customerId y cambió
    lastCustomerIdRef.current = customerId
    hasFetchedPostersRef.current = true
    
    setLoading(true)
    fetchFeedPosts(customerId)
      .then((data) => {
        console.log(`📱 [UNIFIED FEED] Posters obtenidos: ${data.length}`);
        setPosters(data)
      })
      .catch((error: any) => {
        console.error("Error fetching posters:", {
          message: error?.message,
          stack: error?.stack,
          customerId,
          error
        })
        setPosters([]); // Asegurar que posters sea un array vacío
      })
      .finally(() => {
        setLoading(false)
      })
  }, [customerId])


  // Usar useRef para comparar valores anteriores y evitar re-renders infinitos
  const prevProductsIdsRef = useRef<string>('')
  const prevPostersIdsRef = useRef<string>('')
  const prevIsLoadingRef = useRef<boolean>(isLoading)
  const prevHidePostersRef = useRef<boolean>(hidePostersWhileLoading)
  const prevProductsLengthRef = useRef<number>(products?.length || 0)
  const prevPostersLengthRef = useRef<number>(posters?.length || 0)

  // Combinar productos, posters y banner con frecuencia optimizada
  // Estrategia: Banner al inicio, luego 1 publicación cada 4-5 productos
  useEffect(() => {
    // Calcular IDs solo si la longitud cambió (optimización)
    const currentProductsLength = products?.length || 0
    const currentPostersLength = posters?.length || 0
    
    // Solo calcular IDs si la longitud cambió
    let currentProductsIds = prevProductsIdsRef.current
    if (currentProductsLength !== prevProductsLengthRef.current) {
      currentProductsIds = products?.map(p => p?.id).filter(Boolean).join(',') || ''
    }
    
    let currentPostersIds = prevPostersIdsRef.current
    if (currentPostersLength !== prevPostersLengthRef.current) {
      currentPostersIds = posters?.map(p => p?.id).filter(Boolean).join(',') || ''
    }
    
    // Solo ejecutar si realmente cambiaron los datos
    const productsChanged = currentProductsIds !== prevProductsIdsRef.current
    const postersChanged = currentPostersIds !== prevPostersIdsRef.current
    const isLoadingChanged = isLoading !== prevIsLoadingRef.current
    const hidePostersChanged = hidePostersWhileLoading !== prevHidePostersRef.current
    
    if (!productsChanged && !postersChanged && !isLoadingChanged && !hidePostersChanged) {
      // No hay cambios, no ejecutar
      return
    }
    
    // Actualizar referencias
    prevProductsIdsRef.current = currentProductsIds
    prevPostersIdsRef.current = currentPostersIds
    prevIsLoadingRef.current = isLoading
    prevHidePostersRef.current = hidePostersWhileLoading
    prevProductsLengthRef.current = currentProductsLength
    prevPostersLengthRef.current = currentPostersLength
    
    console.log(`🔄 [UNIFIED FEED] useEffect ejecutado:`, {
      productsCount: products?.length || 0,
      postersCount: posters?.length || 0,
      isLoading,
      hidePostersWhileLoading,
      productsChanged,
      postersChanged
    });
    
    // OPTIMIZACIÓN: Banner estático que no se recarga al cambiar categoría
    // Como en ML/Amazon, el banner permanece igual independientemente de la categoría
    const combined: FeedItem[] = []
    
    // Agregar banner estático al inicio (no depende de productos)
    combined.push({ 
      type: 'banner', 
      data: staticBannerData
    })
    
    // Si está cargando y debemos ocultar posters, no incluir posters
    const shouldShowPosters = !(hidePostersWhileLoading && isLoading)
    const hasPosters = posters && Array.isArray(posters) && posters.length > 0;
    const hasProducts = products && Array.isArray(products) && products.length > 0;
    
    console.log(`🔍 [UNIFIED FEED] Condiciones:`, {
      hasProducts,
      hasPosters,
      shouldShowPosters,
      productsCount: products?.length || 0,
      postersCount: posters?.length || 0
    });
    
    if (hasProducts && hasPosters && shouldShowPosters) {
      // Crear un Set para rastrear IDs ya agregados y evitar duplicados
      const addedIds = new Set<string>()
      
      // Filtrar productos y posters válidos
      const validProducts = products.filter(p => p && p.id)
      const validPosters = posters.filter(p => p && p.id)
      
      let productIndex = 0
      let posterIndex = 0
      let productsSinceLastPoster = 0
      const PRODUCTS_PER_POSTER = 4 // 1 publicación cada 4 productos (20% social, 80% productos) - Ajustable
      const PRODUCTS_PER_BANNER = 15 // 1 banner cada 15 productos (después del primero) - Ajustable
      let totalProductsAdded = 0
      
      // Mezclar productos y posters con la frecuencia deseada
      while (productIndex < validProducts.length || posterIndex < validPosters.length) {
        // Agregar productos hasta alcanzar la frecuencia deseada
        while (productIndex < validProducts.length && productsSinceLastPoster < PRODUCTS_PER_POSTER) {
          const product = validProducts[productIndex]
          const productId = `product-${product.id}`
          
          if (!addedIds.has(productId)) {
            combined.push({ type: 'product', data: product })
            addedIds.add(productId)
            productsSinceLastPoster++
            totalProductsAdded++
            
            // Agregar banner cada X productos (después del primero que ya está al inicio)
            // Solo agregar si no hay un banner justo antes (evitar duplicados)
            if (totalProductsAdded > 0 && totalProductsAdded % PRODUCTS_PER_BANNER === 0) {
              const lastItem = combined[combined.length - 1]
              // Solo agregar si el último item no es un banner
              if (lastItem && lastItem.type !== 'banner') {
                // OPTIMIZACIÓN: Usar banner estático también para banners intermedios
                combined.push({ 
                  type: 'banner', 
                  data: { id: `promo-banner-${Math.floor(totalProductsAdded / PRODUCTS_PER_BANNER) + 1}`, products: [] } 
                })
              }
            }
          }
          productIndex++
        }
        
        // Agregar una publicación después de cada grupo de productos
        if (posterIndex < validPosters.length && productsSinceLastPoster >= PRODUCTS_PER_POSTER) {
          const poster = validPosters[posterIndex]
          const posterId = `poster-${poster.id}`
          
          if (!addedIds.has(posterId)) {
            combined.push({ type: 'poster', data: poster })
            addedIds.add(posterId)
            productsSinceLastPoster = 0 // Resetear contador
          }
          posterIndex++
        }
        
        // Si ya no hay más productos pero sí hay posters, agregar los posters restantes
        if (productIndex >= validProducts.length && posterIndex < validPosters.length) {
          const poster = validPosters[posterIndex]
          const posterId = `poster-${poster.id}`
          
          if (!addedIds.has(posterId)) {
            combined.push({ type: 'poster', data: poster })
            addedIds.add(posterId)
          }
          posterIndex++
        }
        
        // Si ya no hay más posters pero sí hay productos, agregar los productos restantes
        if (posterIndex >= validPosters.length && productIndex < validProducts.length) {
          const product = validProducts[productIndex]
          const productId = `product-${product.id}`
          
          if (!addedIds.has(productId)) {
            combined.push({ type: 'product', data: product })
            addedIds.add(productId)
            totalProductsAdded++
            
            // Agregar banner cada X productos
            if (totalProductsAdded > 0 && totalProductsAdded % PRODUCTS_PER_BANNER === 0) {
              const lastItem = combined[combined.length - 1]
              // Solo agregar si el último item no es un banner
              if (lastItem && lastItem.type !== 'banner') {
                combined.push({ 
                  type: 'banner', 
                  data: { id: `promo-banner-${Math.floor(totalProductsAdded / PRODUCTS_PER_BANNER) + 1}`, products: [] } 
                })
              }
            }
          }
          productIndex++
        }
      }
      
      setFeedItems(combined)
    } else if (hasProducts) {
      // Solo productos - banner ya está en combined
      console.log(`📦 [UNIFIED FEED] Procesando ${products.length} productos (sin posters)`);
      const validProductsForItems = products.filter(p => {
        const isValid = p && p.id && p.title;
        if (!isValid) {
          console.warn(`⚠️ [UNIFIED FEED] Producto inválido filtrado:`, {
            id: p?.id,
            title: p?.title,
            hasThumbnail: !!p?.thumbnail,
            hasVariants: !!p?.variants?.length
          });
        }
        return isValid;
      });
      console.log(`✅ [UNIFIED FEED] ${validProductsForItems.length} productos válidos después del filtro`);
      
      if (validProductsForItems.length === 0) {
        console.error(`❌ [UNIFIED FEED] No hay productos válidos después del filtro!`, {
          totalProducts: products.length,
          sampleProduct: products[0]
        });
      }
      
      const productItems = validProductsForItems.map(p => ({ type: 'product' as const, data: p }))
      console.log(`📋 [UNIFIED FEED] Creando ${productItems.length} items de feed`);
      setFeedItems([
        ...combined, // Banner ya está aquí
        ...productItems
      ])
    } else if (posters && Array.isArray(posters) && shouldShowPosters) {
      // Solo posters - banner ya está en combined (solo si no está cargando)
      const validPosters = posters.filter(p => p && p.id)
      setFeedItems([
        ...combined, // Banner ya está aquí
        ...validPosters.map(p => ({ type: 'poster' as const, data: p }))
      ])
    } else {
      // Incluso si no hay productos ni posters, mostrar banner vacío (ya está en combined)
      setFeedItems(combined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products?.length, posters?.length, isLoading, hidePostersWhileLoading, staticBannerData])

  // Funciones para manejar los modales
  const openPosterModal = (poster: Poster) => {
    setSelectedPoster(poster)
    setIsPosterModalOpen(true)
  }

  const closePosterModal = () => {
    setSelectedPoster(null)
    setIsPosterModalOpen(false)
  }

  const openProductModal = (product: Product) => {
    setSelectedProduct(product)
    setIsProductModalOpen(true)
  }

  const closeProductModal = () => {
    setSelectedProduct(null)
    setIsProductModalOpen(false)
  }

  // Log del estado actual para debugging (solo cuando cambia)
  const currentStateLog = JSON.stringify({
    loading,
    feedItemsCount: feedItems.length,
    productsCount: products?.length || 0,
    postersCount: posters?.length || 0,
    isLoading,
    hidePostersWhileLoading
  })
  
  useEffect(() => {
    if (currentStateLog !== lastRenderLogRef.current) {
      console.log(`📊 [UNIFIED FEED] Estado actual:`, {
        loading,
        feedItemsCount: feedItems.length,
        productsCount: products?.length || 0,
        postersCount: posters?.length || 0,
        isLoading,
        hidePostersWhileLoading
      })
      lastRenderLogRef.current = currentStateLog
    }
  }, [currentStateLog, loading, feedItems.length, products?.length, posters?.length, isLoading, hidePostersWhileLoading])

  if (loading) {
    console.log(`⏳ [UNIFIED FEED] Mostrando loading...`);
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  if (feedItems.length === 0) {
    console.warn(`⚠️ [UNIFIED FEED] No hay feedItems para mostrar`, {
      products: products?.length || 0,
      posters: posters?.length || 0,
      isLoading
    });
    return (
      <div className={`text-center p-8 ${isLightMode ? 'text-black' : 'text-white'}`}>
        <p>No hay contenido para mostrar.</p>
        <p className="text-sm mt-2 opacity-70">
          Productos: {products?.length || 0} | Posts: {posters?.length || 0}
        </p>
      </div>
    )
  }
  
  // Log de renderizado solo cuando cambia el número de items
  useEffect(() => {
    if (feedItems.length !== lastFeedItemsCountRef.current) {
      console.log(`✅ [UNIFIED FEED] Renderizando ${feedItems.length} items del feed`)
      lastFeedItemsCountRef.current = feedItems.length
    }
  }, [feedItems.length])

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .masonry-container-unified {
          position: relative;
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
        }
        
        .masonry-item-unified {
          position: absolute;
          transition: all 0.3s ease;
        }
        
        @media (min-width: 640px) {
          .masonry-container-unified {
            max-width: 700px;
          }
        }
        
        @media (min-width: 768px) {
          .masonry-container-unified {
            max-width: 1050px;
          }
        }
        
        @media (min-width: 1024px) {
          .masonry-container-unified {
            max-width: 1400px;
          }
        }
        
        @media (min-width: 1440px) {
          .masonry-container-unified {
            max-width: 1400px;
          }
        }
        
        @media (min-width: 1920px) {
          .masonry-container-unified {
            max-width: 1400px;
          }
        }
      `}} />
      <div className="w-full px-1 sm:px-2 md:px-4 py-1 sm:py-3 md:py-5">
        {/* Unified Feed Masonry Layout */}
        <div 
          ref={containerRef} 
          className="masonry-container-unified" 
          style={{ 
            minHeight: positions.length > 0 && !isCalculating && positions.length === feedItems.filter(item => item && item.type).length
              ? Math.max(...positions.map((p, i) => {
                  const item = feedItems[i]
                  if (!item || !p) return 0
                  const itemKey = item.type === 'product' 
                    ? `product-${(item.data as Product).id}-${i}`
                    : item.type === 'poster'
                    ? `poster-${(item.data as Poster).id}-${i}`
                    : `banner-${(item.data as { id: string, products: Product[] }).id}-${i}`
                  const element = itemRefs.current.get(itemKey)
                  // Usar la altura medida o una estimación basada en el tipo
                  // Altura estimada: banner tiene h-96 (384px) en desktop + márgenes
                  const itemHeight = element?.offsetHeight || (item.type === 'poster' ? 500 : item.type === 'banner' ? 420 : 400)
                  return p.top + itemHeight
                }).filter(h => h > 0)) + gap || 'auto'
              : 'auto'
          }}
        >
          {feedItems.filter(item => item && item.type).map((item, index) => {
            if (!item || !item.type) return null

            const itemKey = item.type === 'product' 
              ? `product-${(item.data as Product).id}-${index}`
              : `poster-${(item.data as Poster).id}-${index}`
            
            const position = positions[index]
            const hasPosition = position && position.width > 0
            
            // Calcular ancho por defecto basado en el número de columnas
            const getDefaultWidth = () => {
              if (!containerRef.current) return '100%'
              const containerWidth = containerRef.current.offsetWidth
              const columnWidth = (containerWidth - (gap * (columns - 1))) / columns
              
              // Los banners: el primero ocupa todo el ancho, los demás 2 columnas
              if (item.type === 'banner') {
                const bannerData = item.data as { id: string, products: Product[] }
                const isFirstBanner = bannerData.id === 'promo-banner-1'
                if (isFirstBanner) {
                  return `${containerWidth}px` // Primer banner: ancho completo
                } else {
                  // Banners siguientes: 2 columnas en pantallas grandes
                  if (columns >= 3) {
                    return `${(columnWidth * 2) + gap}px`
                  }
                  return `${containerWidth}px` // En móviles: ancho completo
                }
              }
              // En móviles (2 columnas), las publicaciones ocupan 1 columna
              // En pantallas más grandes (3+ columnas), ocupan 2 columnas
              if (item.type === 'poster' && columns >= 3) {
                return `${(columnWidth * 2) + gap}px`
              }
              return `${columnWidth}px`
            }
            
            if (item.type === 'product') {
              const product = item.data as Product
              return (
                <div 
                  key={itemKey}
                  ref={(el) => {
                    if (el) itemRefs.current.set(itemKey, el)
                    else itemRefs.current.delete(itemKey)
                  }}
                  className="masonry-item-unified"
                  style={{
                    position: 'absolute',
                    top: hasPosition ? `${position.top}px` : '-9999px',
                    left: hasPosition ? `${position.left}px` : '0px',
                    width: hasPosition ? `${position.width}px` : getDefaultWidth(),
                    opacity: hasPosition ? 1 : 0,
                    visibility: hasPosition ? 'visible' : 'hidden',
                    pointerEvents: hasPosition ? 'auto' : 'none',
                    transition: hasPosition ? 'opacity 0.6s ease-out, transform 0.6s ease-out' : 'none',
                    transform: hasPosition ? 'translateY(0)' : 'translateY(20px)',
                    zIndex: 10,
                  }}
                >
                  <ProductCard 
                    product={product} 
                    onOpenModal={openProductModal}
                    isAuthenticated={isAuthenticated}
                    isLightMode={isLightMode}
                  />
                </div>
              )
            } else if (item.type === 'poster') {
              const poster = item.data as Poster
              return (
                <div 
                  key={itemKey}
                  ref={(el) => {
                    if (el) itemRefs.current.set(itemKey, el)
                    else itemRefs.current.delete(itemKey)
                  }}
                  className="masonry-item-unified"
                  style={{
                    position: 'absolute',
                    top: hasPosition ? `${position.top}px` : '-9999px',
                    left: hasPosition ? `${position.left}px` : '0px',
                    width: hasPosition ? `${position.width}px` : getDefaultWidth(),
                    opacity: hasPosition ? 1 : 0,
                    visibility: hasPosition ? 'visible' : 'hidden',
                    pointerEvents: hasPosition ? 'auto' : 'none',
                    transition: hasPosition ? 'opacity 0.6s ease-out, transform 0.6s ease-out' : 'none',
                    transform: hasPosition ? 'translateY(0)' : 'translateY(20px)',
                    zIndex: 10,
                  }}
                >
                  <PosterCard 
                    poster={poster}
                    onOpenModal={openPosterModal}
                    isLightMode={isLightMode}
                  />
                </div>
              )
            } else if (item.type === 'banner') {
              const bannerData = item.data as { id: string, products: Product[] }
              return (
                <div 
                  key={itemKey}
                  ref={(el) => {
                    if (el) itemRefs.current.set(itemKey, el)
                    else itemRefs.current.delete(itemKey)
                  }}
                  className="masonry-item-unified"
                  style={{
                    position: 'absolute',
                    top: hasPosition ? `${position.top}px` : '-9999px',
                    left: hasPosition ? `${position.left}px` : '0px',
                    width: hasPosition ? `${position.width}px` : getDefaultWidth(),
                    opacity: hasPosition ? 1 : 0,
                    visibility: hasPosition ? 'visible' : 'hidden',
                    pointerEvents: hasPosition ? 'auto' : 'none',
                    transition: hasPosition ? 'opacity 0.6s ease-out, transform 0.6s ease-out' : 'none',
                    transform: hasPosition ? 'translateY(0)' : 'translateY(20px)',
                    zIndex: 10,
                  }}
                >
                  <BlackFridayAd products={bannerData.products} />
                </div>
              )
            }
            
            return null
          })}
          
          {/* Indicador de carga animado cuando no hay items (carga inicial o cambio de categoría) */}
          {isLoading && feedItems.length <= 1 && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ minHeight: '400px', zIndex: 5 }}>
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-[#66DEDB] border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-4 border-[#73FFA2] border-t-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <p className="text-[#66DEDB] text-sm font-medium">Cargando productos...</p>
              </div>
            </div>
          )}
          
          {/* Skeleton loaders integrados en masonry - Mostrar cuando está cargando */}
          {/* OPTIMIZACIÓN: Mostrar todos los skeletons de una vez para carga suave */}
          {/* Como ML/Amazon: skeleton visible de inmediato al cambiar categoría */}
          {isLoading && Array.from({ length: PRODUCTS_PER_PAGE || 100 }).map((_, skeletonIndex) => {
            const skeletonKey = `skeleton-${skeletonIndex}`
            
            // Calcular posición del skeleton basado en las posiciones existentes
            const getSkeletonPosition = () => {
              if (!containerRef.current) return null
              
              // Si no hay items aún, posicionar skeletons desde el inicio
              if (positions.length === 0 || feedItems.length === 0) {
                const containerWidth = containerRef.current.offsetWidth
                const columnWidth = (containerWidth - (gap * (columns - 1))) / columns
                const skeletonColumn = skeletonIndex % columns
                const skeletonRow = Math.floor(skeletonIndex / columns)
                const estimatedHeight = 400 // Altura estimada de una card
                
                return {
                  top: skeletonRow * (estimatedHeight + gap),
                  left: (columnWidth * skeletonColumn) + (gap * skeletonColumn),
                  width: columnWidth
                }
              }
              
              const containerWidth = containerRef.current.offsetWidth
              const columnWidth = (containerWidth - (gap * (columns - 1))) / columns
              
              // Calcular altura de cada columna basada en los items existentes
              const columnHeights = new Array(columns).fill(0)
              
              positions.forEach((pos, idx) => {
                if (idx < feedItems.length && pos) {
                  const item = feedItems[idx]
                  if (item) {
                    const itemKey = item.type === 'product' 
                      ? `product-${(item.data as Product).id}-${idx}`
                      : item.type === 'poster'
                      ? `poster-${(item.data as Poster).id}-${idx}`
                      : `banner-${(item.data as { id: string, products: Product[] }).id}-${idx}`
                    const element = itemRefs.current.get(itemKey)
                    
                    // Calcular en qué columna(s) está este item
                    // Los banners pueden ocupar múltiples columnas
                    if (item.type === 'banner') {
                      const bannerData = item.data as { id: string, products: Product[] }
                      const isFirstBanner = bannerData.id === 'promo-banner-1'
                      if (isFirstBanner) {
                        // Primer banner ocupa todo el ancho, afecta todas las columnas
                        const itemHeight = element?.offsetHeight || 420
                        columnHeights.forEach((_, colIdx) => {
                          columnHeights[colIdx] = Math.max(columnHeights[colIdx], pos.top + itemHeight)
                        })
                      } else {
                        // Banners siguientes ocupan 2 columnas
                        const itemHeight = element?.offsetHeight || 420
                        const startCol = Math.floor((pos.left || 0) / (columnWidth + gap))
                        for (let colIdx = startCol; colIdx < Math.min(startCol + 2, columns); colIdx++) {
                          columnHeights[colIdx] = Math.max(columnHeights[colIdx], pos.top + itemHeight)
                        }
                      }
                    } else {
                      // Productos y posters ocupan 1 o 2 columnas según el tamaño
                      const itemWidth = pos.width || columnWidth
                      const numCols = Math.round(itemWidth / (columnWidth + gap))
                      const startCol = Math.floor((pos.left || 0) / (columnWidth + gap))
                      const itemHeight = element?.offsetHeight || (item.type === 'poster' ? 500 : 400)
                      
                      for (let colIdx = startCol; colIdx < Math.min(startCol + numCols, columns); colIdx++) {
                        columnHeights[colIdx] = Math.max(columnHeights[colIdx], pos.top + itemHeight)
                      }
                    }
                  }
                }
              })
              
              // Encontrar la columna más corta para este skeleton (rotar entre columnas)
              const skeletonColumn = skeletonIndex % columns
              const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights))
              // Usar la columna más corta, pero rotar si hay muchas skeletons
              const targetColumn = skeletonIndex < columns ? shortestColumn : skeletonColumn
              const top = columnHeights[targetColumn] + gap
              
              return {
                top,
                left: (columnWidth * targetColumn) + (gap * targetColumn),
                width: columnWidth
              }
            }
            
            const skeletonPosition = getSkeletonPosition()
            
            return (
              <div
                key={skeletonKey}
                className="masonry-item-unified"
                style={{
                  position: 'absolute',
                  top: skeletonPosition ? `${skeletonPosition.top}px` : '-9999px',
                  left: skeletonPosition ? `${skeletonPosition.left}px` : '0px',
                  width: skeletonPosition ? `${skeletonPosition.width}px` : '100%',
                  opacity: skeletonPosition ? 0.6 : 0,
                  transition: 'opacity 0.4s ease-in',
                  zIndex: 1, // Asegurar que estén detrás de los items reales
                }}
              >
                <SkeletonProductCard />
              </div>
            )
          })}
        </div>
        
        {/* Modales */}
        {selectedPoster && (
          <PosterModal 
            poster={selectedPoster} 
            isOpen={isPosterModalOpen} 
            onClose={closePosterModal}
            customerId={customerId}
          />
        )}
        {selectedProduct && (
          <ProductModal 
            product={selectedProduct} 
            isOpen={isProductModalOpen} 
            onClose={closeProductModal}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>
    </>
  )
}
