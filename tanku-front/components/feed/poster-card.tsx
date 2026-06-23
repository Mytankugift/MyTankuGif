'use client'

import React, { useState, useRef, useEffect, memo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import { tankuMediaFullRadiusStyle } from '@/lib/utils/tanku-card-radius'
import { SharePostModal } from '@/components/posters/share-post-modal'

interface PosterCardProps {
  poster: {
    id: string
    type: 'poster'
    imageUrl: string
    videoUrl?: string | null
    description?: string | null
    likesCount: number
    commentsCount: number
    createdAt: string
    isLiked?: boolean
    author?: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
      username: string | null
      avatar: string | null
    }
  }
  onOpenModal?: (poster: any) => void
  onLikeUpdated?: (posterId: string, updates: { isLiked: boolean; likesCount: number }) => void
  /** Si no hay sesión, like/compartir abren este callback (p. ej. modal de login) */
  onAuthRequired?: () => void
  isLightMode?: boolean
  isAboveFold?: boolean // Nuevo prop: visible sin scroll (above the fold)
  variant?: 'feed' | 'profile'
}

export const PosterCard = memo(function PosterCard({
  poster,
  onOpenModal,
  onLikeUpdated,
  onAuthRequired,
  isLightMode = false,
  isAboveFold = false,
  variant = 'feed',
}: PosterCardProps) {
  const router = useRouter()
  const { token } = useAuthStore()
  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image')
  const [imageError, setImageError] = useState(false)
  const [isLiked, setIsLiked] = useState(poster.isLiked || false)
  const [likesCount, setLikesCount] = useState(poster.likesCount || 0)
  const [isLiking, setIsLiking] = useState(false)
  const hasUserToggledLike = useRef(false)
  const previousPosterIdRef = useRef<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const pointerDownRef = useRef<{ clientX: number; clientY: number } | null>(null)
  const [isVideoVisible, setIsVideoVisible] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  useEffect(() => {
    if (poster.imageUrl) {
      setActiveMedia('image')
    } else if (poster.videoUrl) {
      setActiveMedia('video')
    }
  }, [poster.imageUrl, poster.videoUrl])

  useEffect(() => {
    const currentPosterId = poster.id

    if (previousPosterIdRef.current !== currentPosterId) {
      hasUserToggledLike.current = false
      previousPosterIdRef.current = currentPosterId
      if (poster.likesCount !== undefined) {
        setLikesCount(poster.likesCount)
      }
      if (poster.isLiked !== undefined) {
        setIsLiked(poster.isLiked)
      }
    } else if (!hasUserToggledLike.current) {
      if (poster.likesCount !== undefined) {
        setLikesCount(poster.likesCount)
      }
      if (poster.isLiked !== undefined) {
        setIsLiked(poster.isLiked)
      }
    }
  }, [poster.id, poster.isLiked, poster.likesCount])

  useEffect(() => {
    if (!poster.videoUrl || activeMedia !== 'video') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVideoVisible(true)
            if (videoRef.current) {
              videoRef.current.play().catch((error) => {
                console.warn('Error al reproducir video automaticamente:', error)
              })
            }
          } else {
            setIsVideoVisible(false)
            if (videoRef.current) {
              videoRef.current.pause()
            }
          }
        })
      },
      {
        threshold: 0.5,
        rootMargin: '50px',
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
  }, [poster.videoUrl, activeMedia])

  const handleVideoReady = () => {
    if (videoRef.current && isVideoVisible && activeMedia === 'video') {
      videoRef.current.play().catch((error) => {
        console.warn('Error al reproducir video:', error)
      })
    }
  }

  useEffect(() => {
    if (activeMedia === 'video' && videoRef.current && isVideoVisible) {
      videoRef.current.play().catch((error) => {
        console.warn('Error al reproducir video al cambiar a vista de video:', error)
      })
    } else if (activeMedia === 'image' && videoRef.current) {
      videoRef.current.pause()
    }
  }, [activeMedia, isVideoVisible])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMuted(!isMuted)
  }

  const TAP_MOVE_THRESHOLD_PX = 14

  const isTouchUi = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches

  const handleCardClick = (e: React.MouseEvent) => {
    if (isShareModalOpen) return

    const down = pointerDownRef.current
    pointerDownRef.current = null

    if (down) {
      const dx = e.clientX - down.clientX
      const dy = e.clientY - down.clientY
      if (dx * dx + dy * dy > TAP_MOVE_THRESHOLD_PX * TAP_MOVE_THRESHOLD_PX) return
    } else if (isTouchUi()) {
      return
    }

    if (onOpenModal) {
      onOpenModal(poster)
    }
  }

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!token) {
      onAuthRequired?.()
      return
    }
    setIsShareModalOpen(true)
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!token) {
      onAuthRequired?.()
      return
    }
    if (isLiking) return

    setIsLiking(true)
    try {
      const response = await apiClient.post<import('@/types/api-responses').LikeResponse>(
        API_ENDPOINTS.POSTERS.REACT(poster.id),
        { reactionType: 'like' }
      )

      if (response.success && response.data) {
        const data = response.data
        const newCount =
          data.likesCount !== undefined
            ? data.likesCount
            : data.liked
              ? likesCount + 1
              : Math.max(0, likesCount - 1)
        setIsLiked(data.liked)
        setLikesCount(newCount)
        hasUserToggledLike.current = true
        onLikeUpdated?.(poster.id, { isLiked: data.liked, likesCount: newCount })
      }
    } catch (err) {
      console.error('Error al dar like:', err)
    } finally {
      setIsLiking(false)
    }
  }

  const authorUsername =
    poster.author?.username?.trim() ||
    poster.author?.email?.split('@')[0] ||
    'usuario'
  const authorDisplayName =
    authorUsername.length > 16 ? `${authorUsername.slice(0, 14)}…` : authorUsername

  const goToAuthorProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!poster.author?.id) return
    router.push(
      poster.author.username
        ? `/profile/${poster.author.username}`
        : `/profile/${poster.author.id}`,
    )
  }

  const isProfileVariant = variant === 'profile'

  return (
    <>
    <div
      ref={cardRef}
      className={`touch-manipulation bg-transparent rounded-lg sm:rounded-2xl cursor-pointer ${
        isProfileVariant
          ? 'p-0 hover:opacity-95 transition-opacity duration-200'
          : 'p-2 sm:p-3 md:p-4 hover:shadow-lg transition-all duration-300 hover:scale-105'
      }`}
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
    >
      {!isProfileVariant && (
        <div className="flex items-center mb-2 sm:mb-3 min-w-0">
          <button
            type="button"
            onClick={goToAuthorProfile}
            className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
            aria-label={`Perfil de ${authorDisplayName}`}
          >
            {poster.author?.avatar ? (
              <Image
                src={poster.author.avatar}
                alt={authorDisplayName}
                width={32}
                height={32}
                className="object-cover w-full h-full"
                unoptimized={poster.author.avatar.startsWith('http')}
              />
            ) : (
              <span className="text-xs text-gray-400 font-bold">
                {(authorUsername[0] || 'U').toUpperCase()}
              </span>
            )}
          </button>
          <div className="ml-1.5 sm:ml-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={goToAuthorProfile}
              className={`font-medium text-xs sm:text-sm truncate max-w-[88px] sm:max-w-[120px] md:max-w-[160px] text-left hover:text-[#73FFA2] transition-colors ${
                isLightMode ? 'text-black' : 'text-white'
              }`}
              title={authorUsername}
            >
              {authorDisplayName}
            </button>
            <p className={`text-xs ${isLightMode ? 'text-gray-600' : 'text-gray-400'}`}>
              {new Date(poster.createdAt).toLocaleDateString('es-ES', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      )}

      <div
        className={`w-full relative overflow-hidden ${isProfileVariant ? '' : 'mb-2 sm:mb-3 md:mb-4'}`}
        style={isProfileVariant ? undefined : tankuMediaFullRadiusStyle}
      >
        {(poster.imageUrl || poster.videoUrl) && (
          <>
            {poster.imageUrl && (
              <div
                className={`relative w-full overflow-hidden ${
                  activeMedia === 'image' ? 'block' : 'hidden'
                }`}
                style={{
                  width: '100%',
                  aspectRatio: '3/4',
                  maxHeight: 'none',
                  minHeight: 'auto',
                }}
              >
                {!imageError ? (
                  <Image
                    key={poster.imageUrl}
                    src={poster.imageUrl}
                    alt="Imagen de publicacion"
                    width={300}
                    height={400}
                    className="w-full h-full object-cover object-center"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 25vw"
                    loading={isAboveFold ? 'eager' : 'lazy'}
                    onError={() => {
                      console.warn('[PosterCard] Error cargando imagen:', poster.imageUrl)
                      setImageError(true)
                    }}
                    unoptimized={
                      isRemoteImageSrc(poster.imageUrl) ||
                      poster.imageUrl?.includes('.gif') === true
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
                    }}
                  >
                    <span className="text-gray-500 text-sm">Sin imagen</span>
                  </div>
                )}
              </div>
            )}

            {poster.videoUrl && (
              <div
                className={`relative w-full bg-gray-800 flex items-center justify-center overflow-hidden ${
                  activeMedia === 'video' ? 'block' : 'hidden'
                }`}
                style={{
                  width: '100%',
                  aspectRatio: '3/4',
                  maxHeight: 'none',
                  minHeight: 'auto',
                }}
              >
                <video
                  ref={videoRef}
                  src={poster.videoUrl}
                  className="w-full h-full object-cover object-center"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  muted={isMuted}
                  loop
                  playsInline
                  preload="metadata"
                  onLoadedData={handleVideoReady}
                  onCanPlay={handleVideoReady}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity duration-200 pointer-events-none" />

                <button
                  onClick={handleToggleMute}
                  className="absolute bottom-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-1.5 sm:p-2 transition-all duration-200 z-10"
                  aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {isMuted ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {poster.imageUrl && poster.videoUrl && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMedia('image')
                    if (videoRef.current) {
                      videoRef.current.pause()
                    }
                  }}
                  className={`absolute left-1 sm:left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 rounded-full p-1 sm:p-1.5 md:p-2 hover:bg-opacity-80 transition-all ${
                    activeMedia === 'video' ? 'visible' : 'invisible'
                  }`}
                >
                  <Image
                    src="/feed/Flecha.svg"
                    alt="Anterior"
                    width={16}
                    height={16}
                    className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"
                  />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMedia('video')
                    if (videoRef.current && isVideoVisible) {
                      videoRef.current.play().catch((error) => {
                        console.warn('Error al reproducir video:', error)
                      })
                    }
                  }}
                  className={`absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 rounded-full p-1 sm:p-1.5 md:p-2 hover:bg-opacity-80 transition-all ${
                    activeMedia === 'image' ? 'visible' : 'invisible'
                  }`}
                >
                  <Image
                    src="/feed/Flecha.svg"
                    alt="Siguiente"
                    width={16}
                    height={16}
                    className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 transform rotate-180"
                  />
                </button>

                <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 sm:space-x-2">
                  <div
                    className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                      activeMedia === 'image' ? 'bg-[#73FFA2]' : 'bg-white bg-opacity-50'
                    }`}
                  ></div>
                  <div
                    className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                      activeMedia === 'video' ? 'bg-[#73FFA2]' : 'bg-white bg-opacity-50'
                    }`}
                  ></div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {!isProfileVariant && (
        <div className="flex justify-between items-center mt-1 sm:mt-2">
          <button
            className="flex items-center transition-colors hover:opacity-80"
            onClick={handleLike}
            disabled={isLiking}
          >
            <img
              src={isLiked ? '/icons_tanku/tanku_megusta_relleno.svg' : '/icons_tanku/tanku_megusta_lineas.svg'}
              alt={isLiked ? 'Quitar me gusta' : 'Me gusta'}
              className="mr-1 h-4 w-auto sm:mr-1.5 sm:h-5 md:mr-2"
            />
            <span className={`text-xs sm:text-sm ${isLightMode ? 'text-black' : 'text-white'}`}>
              {likesCount}
            </span>
          </button>
          <button
            className="p-1 sm:p-1.5 md:p-2 hover:bg-gray-700 rounded-full transition-colors duration-200"
            onClick={handleShareClick}
          >
            <img
              src="/icons_tanku/tanku_card_compartir_verde.svg"
              alt="Compartir"
              className="h-4 w-auto sm:h-5"
            />
          </button>
        </div>
      )}
    </div>
    {/* Montar solo al abrir: evita ejecutar useSocket()/useChat() por cada card del feed */}
    {isShareModalOpen && (
      <SharePostModal
        isOpen={isShareModalOpen}
        postUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/posts/${poster.id}`}
        postDescription={poster.description}
        onClose={() => setIsShareModalOpen(false)}
      />
    )}
    </>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.poster.id === nextProps.poster.id &&
    prevProps.poster.imageUrl === nextProps.poster.imageUrl &&
    prevProps.poster.likesCount === nextProps.poster.likesCount &&
    prevProps.poster.isLiked === nextProps.poster.isLiked &&
    prevProps.isLightMode === nextProps.isLightMode &&
    prevProps.variant === nextProps.variant
  )
})
