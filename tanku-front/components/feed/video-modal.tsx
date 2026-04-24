'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl?: string
}

export function VideoModal({ isOpen, onClose, videoUrl }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [audioActivated, setAudioActivated] = useState(false)

  const tryUnmute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = false
    setAudioActivated(true)
    v.play().catch(() => {
      logger.log('Reproducción con audio: interacción requerida')
    })
  }, [])

  const onVideoVolumeChange = useCallback(() => {
    const v = videoRef.current
    if (v && !v.muted) setAudioActivated(true)
  }, [])

  // Cargar video solo cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) {
      // Pausar y limpiar cuando se cierra
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
      }
      setAudioActivated(false)
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
      // No tocar .muted: el <video> ya inicia en silencio; forzarlo rompería "Activar audio"
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
        {/* Contenedor de video: X centrada arriba (eje horizontal) sobre el recuadro 16:9 */}
        <div className="relative w-full aspect-video bg-black overflow-hidden">
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
              onVolumeChange={onVideoVolumeChange}
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

          <button
            type="button"
            onClick={onClose}
            className="absolute left-1/2 top-3 z-20 w-10 h-10 -translate-x-1/2 flex items-center justify-center rounded-full bg-black/55 hover:bg-black/75 transition-colors opacity-90 hover:opacity-100 backdrop-blur-sm sm:top-4"
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blueTanku"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {videoUrl && !audioActivated && (
            <div className="pointer-events-auto absolute left-1/2 z-20 w-[min(100%,20rem)] -translate-x-1/2 bottom-[max(0.5rem,calc(0.35rem+env(safe-area-inset-bottom,0px)))] px-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  tryUnmute()
                }}
                className="w-full rounded-2xl bg-greenTanku px-4 py-2.5 text-center text-sm font-semibold text-gray-900 shadow-md transition hover:brightness-95 active:scale-[0.99]"
              >
                Activar audio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

