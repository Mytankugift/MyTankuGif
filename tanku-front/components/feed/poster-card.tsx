'use client'

import React, { useState, useRef, useEffect, memo } from 'react'
import Image from 'next/image'

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
    author?: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
      avatar: string | null
    }
  }
  onOpenModal?: (poster: any) => void
  isLightMode?: boolean
}

export const PosterCard = memo(function PosterCard({ poster, onOpenModal, isLightMode = false }: PosterCardProps) {
  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image')
  const [imageError, setImageError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [isVideoVisible, setIsVideoVisible] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  // Inicializar activeMedia basado en el contenido disponible
  useEffect(() => {
    if (poster.imageUrl) {
      setActiveMedia('image')
    } else if (poster.videoUrl) {
      setActiveMedia('video')
    }
  }, [poster.imageUrl, poster.videoUrl])

  // IntersectionObserver para reproducir video solo cuando está visible
  useEffect(() => {
    if (!poster.videoUrl || activeMedia !== 'video') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVideoVisible(true)
            if (videoRef.current) {
              videoRef.current.play().catch((error) => {
                console.warn('Error al reproducir video automáticamente:', error)
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
    e.stopPropagation()
    setIsMuted(!isMuted)
  }

  const handleCardClick = () => {
    if (onOpenModal) {
      onOpenModal(poster)
    }
  }

  const authorName =
    poster.author?.firstName && poster.author?.lastName
      ? `${poster.author.firstName} ${poster.author.lastName}`
      : poster.author?.email || 'Usuario'

  return (
    <div
      ref={cardRef}
      className="bg-transparent border-2 border-[#73FFA2] rounded-lg sm:rounded-2xl p-2 sm:p-3 md:p-4 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Poster Header */}
      <div className="flex items-center mb-2 sm:mb-3">
        <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
          {poster.author?.avatar ? (
            <Image
              src={poster.author.avatar}
              alt={authorName}
              width={32}
              height={32}
              className="object-cover w-full h-full"
              unoptimized={poster.author.avatar.startsWith('http')}
            />
          ) : (
            <span className="text-xs text-gray-400 font-bold">
              {(poster.author?.firstName?.[0] || poster.author?.email?.[0] || 'U').toUpperCase()}
            </span>
          )}
        </div>
        <div className="ml-1.5 sm:ml-2">
          <p
            className={`font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-full ${
              isLightMode ? 'text-black' : 'text-white'
            }`}
          >
            {authorName}
          </p>
          <p className={`text-xs ${isLightMode ? 'text-gray-600' : 'text-gray-400'}`}>
            {new Date(poster.createdAt).toLocaleDateString('es-ES', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Poster Media */}
      <div className="w-full relative mb-2 sm:mb-3 md:mb-4 overflow-hidden rounded-lg">
        {(poster.imageUrl || poster.videoUrl) && (
          <>
            {/* Caso 1: Tiene imagen */}
            {poster.imageUrl && (
              <div
                className={`relative w-full overflow-hidden ${
                  activeMedia === 'image' ? 'block' : 'hidden'
                }`}
                style={{ 
                  width: '100%',
                  aspectRatio: '3/4', // Mantener proporción consistente (ancho:alto = 3:4)
                  maxHeight: 'none', // Permitir que aspectRatio controle la altura
                  minHeight: 'auto',
                }}
              >
                {!imageError ? (
                  <Image
                    key={poster.imageUrl}
                    src={poster.imageUrl}
                    alt="Imagen de publicación"
                    width={300}
                    height={400}
                    className="w-full h-full object-cover object-center"
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 25vw"
                    onError={() => {
                      console.warn('[PosterCard] Error cargando imagen:', poster.imageUrl)
                      setImageError(true)
                    }}
                    unoptimized={poster.imageUrl?.includes('.gif')}
                    priority={false}
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

            {/* Caso 2: Tiene video */}
            {poster.videoUrl && (
              <div
                className={`relative w-full bg-gray-800 flex items-center justify-center overflow-hidden ${
                  activeMedia === 'video' ? 'block' : 'hidden'
                }`}
                style={{ 
                  width: '100%',
                  aspectRatio: '3/4', // Mantener proporción consistente (ancho:alto = 3:4)
                  maxHeight: 'none', // Permitir que aspectRatio controle la altura
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

                {/* Botón de mute/unmute */}
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

            {/* Flechas de navegación si hay ambos medios */}
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

                {/* Indicadores de posición */}
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

      {/* Poster Actions */}
      <div className="flex justify-between items-center mt-1 sm:mt-2">
        <button
          className={`flex items-center hover:text-[#73FFA2] transition-colors ${
            isLightMode ? 'text-gray-700' : 'text-gray-300'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 sm:mr-1.5 md:mr-2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span className={`text-xs sm:text-sm ${isLightMode ? 'text-black' : 'text-white'}`}>
            {poster.likesCount}
          </span>
        </button>
        <button
          className="p-1 sm:p-1.5 md:p-2 hover:bg-gray-700 rounded-full transition-colors duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src="/feed/arrow-right 4.svg"
            alt="Share"
            width={16}
            height={16}
            className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"
          />
        </button>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian estas props
  return (
    prevProps.poster.id === nextProps.poster.id &&
    prevProps.poster.imageUrl === nextProps.poster.imageUrl &&
    prevProps.poster.likesCount === nextProps.poster.likesCount &&
    prevProps.isLightMode === nextProps.isLightMode
  )
})

