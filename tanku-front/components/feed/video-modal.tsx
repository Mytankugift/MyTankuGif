'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { logger } from '@/lib/utils/logger'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl?: string
}

export function VideoModal({ isOpen, onClose, videoUrl }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Cargar video solo cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) {
      // Pausar y limpiar cuando se cierra
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
      }
      return
    }

    // Solo cargar cuando está abierto
    if (videoUrl && videoRef.current && videoRef.current.src !== videoUrl) {
      videoRef.current.src = videoUrl
    }
  }, [isOpen, videoUrl])

  // Fallback: si el autoplay falla, iniciar con el primer click del usuario
  useEffect(() => {
    if (!isOpen || !videoRef.current) return

    const startVideo = () => {
      const video = videoRef.current
      if (!video) return
      
      video.muted = true
      video.play().catch(() => {
        logger.log('Autoplay bloqueado, esperando interacción del usuario')
      })
    }

    // Escuchar el primer click del usuario como fallback
    document.addEventListener('click', startVideo, { once: true })

    return () => {
      document.removeEventListener('click', startVideo)
    }
  }, [isOpen])

  // Cerrar con ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div
        className="relative max-w-4xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón X para cerrar - más sutil en azul Tanku */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full transition-colors opacity-80 hover:opacity-100 backdrop-blur-sm"
          aria-label="Cerrar"
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
            className="text-blueTanku"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Contenedor de video */}
        <div className="w-full aspect-video bg-black overflow-hidden">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              playsInline
              preload="auto"
              loop
              controls
              controlsList="nodownload"
              onLoadedData={() => {
                videoRef.current?.play().catch(() => {
                  logger.log('Autoplay bloqueado')
                })
              }}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">Video no disponible</p>
                <p className="text-sm">El video se mostrará aquí cuando esté disponible</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

