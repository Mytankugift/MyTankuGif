"use client"

import { Text, Button } from "@medusajs/ui"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Product } from "@modules/seller/components/table-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishListDropdown from "@modules/home/components/wish-list"
import { retrieveCustomer } from "@lib/data/customer"
import { fetchFeedPosts } from "../actions/get-feed-post"
import { togglePosterLike, getPosterReactions } from "../actions/poster-reactions"
import { getPosterComments, addPosterComment, editPosterComment, deletePosterComment, PosterComment } from "../actions/poster-comments"
import { Heart, MediaPlay, XMark, PencilSquare, Trash } from "@medusajs/icons"

interface UnifiedFeedProps {
  products: Product[]
  customerId: string
  isFeatured?: boolean
}

interface Poster {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
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
  type: 'product' | 'poster'
  data: Product | Poster
}

// Star rating component
const StarRating = ({ rating = 4.8 }: { rating?: number }) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0
  
  return (
    <div className="flex items-center gap-1 mb-2">
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          return (
            <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
          )
        } else if (i === fullStars && hasHalfStar) {
          return (
            <svg key={i} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20">
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
            <svg key={i} className="w-4 h-4 text-gray-300" viewBox="0 0 20 20">
              <path fill="currentColor" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
          )
        }
      })}
      <span className="text-sm text-gray-600 ml-1">{rating}</span>
    </div>
  )
}

// Product Card Component
const ProductCard = ({ product, isAuthenticated }: { product: Product, isAuthenticated: boolean }) => {
  const price = product.variants?.[0]?.inventory?.price || 0
  const currencyCode = product.variants?.[0]?.inventory?.currency_code || '$'
  
  return (
    <div className="bg-transparent border-2 border-[#66DEDB] rounded-2xl p-4 hover:shadow-lg transition-all duration-300 hover:scale-105">
      {/* Star Rating */}
      <StarRating />
      
      {/* Product Image */}
      <LocalizedClientLink href={`/products/tanku/${product.handle}`} className="block">
        <div className="w-full h-48 relative mb-4 overflow-hidden rounded-lg">
          <Image
            src={product.thumbnail || '/placeholder.png'}
            alt={product.title}
            fill
            className="object-cover hover:scale-110 transition-transform duration-300"
          />
        </div>
      </LocalizedClientLink>
      
      {/* Product Title */}
      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
        {product.title}
      </h3>
      
      {/* Price */}
      <div className="text-xl flex justify-between font-bold text-[#66DEDB] mb-4">
        {currencyCode} {price.toLocaleString()}
        <div className="flex items-right">
          {/* Cart Icon */}
          <button className="p-2 hover:bg-gray-700 rounded-full transition-colors duration-200">
            <img src="/feed/Carrito 4.svg" alt="Add to cart" width="24" height="24" />
          </button>
          
          {/* Plus Icon (Wishlist) */}
          {isAuthenticated && (
            <WishListDropdown productId={product.id} productTitle={product.title} />
          )}
          
          {/* Share Icon */}
          <button className="p-2 hover:bg-gray-700 rounded-full transition-colors duration-200">
            <img src="/feed/arrow-right 4.svg" alt="Share" width="24" height="24" />
          </button>
        </div>
      </div>
    </div>
  )
}

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

  // Generar preview del video si existe
  useEffect(() => {
    if (poster.video_url && !poster.image_url) {
      const getVideoPreview = (videoUrl: string): Promise<string> => {
        return new Promise((resolve) => {
          const video = document.createElement('video')
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          video.onloadeddata = () => {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            video.currentTime = 0.1
          }
          
          video.onseeked = () => {
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              resolve(canvas.toDataURL())
            }
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-[1200px] h-[700px] overflow-hidden flex">
        {/* Botón de cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 rounded-full p-2 text-white hover:bg-opacity-75 transition-all"
        >
          <XMark className="w-6 h-6" />
        </button>

        {/* Lado izquierdo - Media */}
        <div className="w-1/2 relative bg-black flex items-center justify-center">
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
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.617l3.766-2.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        <path d="M15.536 14.536L13 12l2.536-2.536a1 1 0 111.414 1.414L14.414 13.5l2.536 2.536a1 1 0 01-1.414 1.414z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.617l3.766-2.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
              
              {/* Controles del slider si hay ambos medios */}
              {poster.image_url && poster.video_url && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
                  <button 
                    onClick={() => setActiveMedia('image')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeMedia === 'image' 
                        ? 'bg-[#73FFA2] text-black' 
                        : 'bg-black bg-opacity-60 text-white hover:bg-opacity-80'
                    }`}
                  >
                    Imagen
                  </button>
                  <button 
                    onClick={() => setActiveMedia('video')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeMedia === 'video' 
                        ? 'bg-[#73FFA2] text-black' 
                        : 'bg-black bg-opacity-60 text-white hover:bg-opacity-80'
                    }`}
                  >
                    Video
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Lado derecho - Información del post */}
        <div className="w-1/2 p-6 flex flex-col">
          {/* Header del usuario */}
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700">
              <Image 
                src="/feed/avatar.png"
                alt={poster.customer_name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="ml-3">
              <p className="text-white font-semibold">{poster.customer_name}</p>
              <p className="text-gray-400 text-sm">
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
            <h2 className="text-xl font-bold text-white mb-3">{poster.title}</h2>
          )}
          
          {poster.description && (
            <p className="text-gray-300 mb-4">{poster.description}</p>
          )}

          {/* Sección de comentarios */}
          <div className="flex-1 flex flex-col min-h-0 mb-4">
            {/* Lista de comentarios */}
            <div className="flex-1 overflow-y-auto max-h-64 mb-4 pr-2">
              {comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                            <Image 
                              src="/feed/avatar.png"
                              alt={comment.customer_name}
                              width={24}
                              height={24}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-white font-medium text-sm">{comment.customer_name}</p>
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
                              <p className="text-gray-300 text-sm break-words">{comment.content}</p>
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
            <div className="border-t border-gray-700 pt-3">
              <div className="flex space-x-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                  <Image 
                    src="/feed/avatar.png"
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
                    className="flex-1 bg-gray-800 text-white text-sm rounded-lg p-2 resize-none border border-gray-600 focus:border-[#73FFA2] focus:outline-none"
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
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
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
          <div className="flex items-center space-x-6 border-t border-gray-700 pt-3">
            <button 
              onClick={handleLikeToggle}
              disabled={isLikeLoading}
              className={`flex items-center transition-colors ${
                isLiked 
                  ? 'text-red-500 hover:text-red-400' 
                  : 'text-gray-300 hover:text-[#73FFA2]'
              } ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Heart 
                className={`w-6 h-6 mr-2 ${isLiked ? 'fill-current' : ''}`} 
              />
              <span>{likesCount}</span>
            </button>
            <div className="flex items-center text-gray-300">
              <span className="mr-2 text-lg">💬</span>
              <span>{commentsCount}</span>
            </div>
            <button className="p-2 hover:bg-gray-700 rounded-full transition-colors duration-200">
              <img src="/feed/arrow-right 4.svg" alt="Share" width="24" height="24" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Poster Card Component (styled like product cards)
const PosterCard = ({ poster, onOpenModal }: { poster: Poster, onOpenModal: (poster: Poster) => void }) => {
  // Función para obtener el primer frame del video como preview
  const getVideoPreview = (videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      video.onloadeddata = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        video.currentTime = 0.1 // Obtener frame a los 0.1 segundos
      }
      
      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL())
        }
      }
      
      video.src = videoUrl
      video.load()
    })
  }

  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  
  // Generar preview del video si existe
  useEffect(() => {
    if (poster.video_url && !poster.image_url) {
      getVideoPreview(poster.video_url)
        .then(setVideoPreview)
        .catch(() => setVideoPreview(null))
    }
  }, [poster.video_url, poster.image_url])

  return (
    <div 
      className="bg-transparent border-2 border-[#73FFA2] rounded-2xl p-4 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
      onClick={() => onOpenModal(poster)}
    >
      {/* Poster Header */}
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700">
          <Image 
            src="/feed/avatar.png"
            alt={poster.customer_name}
            width={32}
            height={32}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="ml-2">
          <p className="text-white font-medium text-sm">{poster.customer_name}</p>
          <p className="text-gray-400 text-xs">
            {new Date(poster.created_at).toLocaleDateString('es-ES', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
      
      {/* Poster Media */}
      <div className="w-full h-48 relative mb-4 overflow-hidden rounded-lg">
        {(poster.image_url || poster.video_url) && (
          <>
            {/* Caso 1: Tiene imagen (con o sin video) */}
            {poster.image_url && (
              <div className="relative w-full h-full">
                <Image
                  src={poster.image_url}
                  alt="Imagen de publicación"
                  fill
                  className="object-cover"
                  unoptimized={poster.image_url.startsWith('blob:') || poster.image_url.startsWith('data:')}
                />
                {/* Indicador de video si también hay video */}
                {poster.video_url && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full p-2">
                    <MediaPlay className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            )}
            
            {/* Caso 2: Solo tiene video (mostrar preview generado) */}
            {poster.video_url && !poster.image_url && (
              <div className="relative w-full h-full bg-gray-800 flex items-center justify-center">
                {videoPreview ? (
                  <>
                    <img
                      src={videoPreview}
                      alt="Preview del video"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full p-2">
                      <MediaPlay className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-gray-400 text-center">
                      <MediaPlay className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">Video</p>
                    </div>
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full p-2">
                      <MediaPlay className="w-4 h-4 text-white" />
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Poster Actions */}
      <div className="flex justify-between items-center">
        <button className="flex items-center text-gray-300 hover:text-[#73FFA2] transition-colors">
          <Heart className="w-5 h-5 mr-2" />
          <span className="text-sm">{poster.likes_count}</span>
        </button>
        <button className="p-2 hover:bg-gray-700 rounded-full transition-colors duration-200">
          <img src="/feed/arrow-right 4.svg" alt="Share" width="20" height="20" />
        </button>
      </div>
    </div>
  )
}

export default function UnifiedFeed({ products, customerId, isFeatured = false }: UnifiedFeedProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [posters, setPosters] = useState<Poster[]>([])
  const [loading, setLoading] = useState(true)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  useEffect(() => {
    const checkAuth = async () => {
      const customer = await retrieveCustomer().catch(() => null)
      setIsAuthenticated(!!customer)
    }
    
    checkAuth()
  }, [])

  useEffect(() => {
    if (customerId) {
      setLoading(true)
      fetchFeedPosts(customerId)
        .then((data) => {
          setPosters(data)
        })
        .catch((error) => {
          console.error("Error fetching posters:", error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [customerId])


  // Combinar y alternar productos y posters
  useEffect(() => {
    if (products && posters) {
      const combined: FeedItem[] = []
      const maxLength = Math.max(products.length, posters.length)
      
      for (let i = 0; i < maxLength; i++) {
        // Agregar producto si existe
        if (i < products.length) {
          combined.push({ type: 'product', data: products[i] })
        }
        // Agregar poster si existe
        if (i < posters.length) {
          combined.push({ type: 'poster', data: posters[i] })
        }
      }
      
      setFeedItems(combined)
    }
  }, [products, posters])

  // Funciones para manejar el modal
  const openModal = (poster: Poster) => {
    setSelectedPoster(poster)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setSelectedPoster(null)
    setIsModalOpen(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  if (feedItems.length === 0) {
    return (
      <div className="text-center p-8 text-white">
        <p>No hay contenido para mostrar.</p>
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-8">
      {/* Unified Feed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {feedItems.map((item, index) => {
          if (item.type === 'product') {
            const product = item.data as Product
            return (
              <ProductCard 
                key={`product-${product.id}-${index}`} 
                product={product} 
                isAuthenticated={isAuthenticated}
              />
            )
          } else {
            const poster = item.data as Poster
            return (
              <PosterCard 
                key={`poster-${poster.id}-${index}`} 
                poster={poster}
                onOpenModal={openModal}
              />
            )
          }
        })}
      </div>
      
      {/* Modal */}
      {selectedPoster && (
        <PosterModal 
          poster={selectedPoster} 
          isOpen={isModalOpen} 
          onClose={closeModal}
          customerId={customerId}
        />
      )}
    </div>
  )
}
