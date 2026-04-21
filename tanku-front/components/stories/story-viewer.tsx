'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { StoryDTO } from '@/lib/hooks/use-stories'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { WishlistStoryCard } from './wishlist-story-card'

interface StoryViewerProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  /** Tras borrar una historia (p. ej. refrescar feed) */
  onStoryDeleted?: () => void
}

export function StoryViewer({ userId, isOpen, onClose, onStoryDeleted }: StoryViewerProps) {
  const { user } = useAuthStore()
  const [stories, setStories] = useState<StoryDTO[]>([])
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  // Cargar stories del usuario
  useEffect(() => {
    if (isOpen && userId) {
      loadStories()
    }
  }, [isOpen, userId])

  const loadStories = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get<StoryDTO[]>(
        API_ENDPOINTS.STORIES.BY_USER(userId)
      )
      if (response.success && response.data) {
        setStories(response.data)
        setCurrentStoryIndex(0)
      }
    } catch (error) {
      console.error('Error cargando stories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const currentStory = stories[currentStoryIndex]
  const currentFile = currentStory?.files[0]

  // Auto-avance de historias
  useEffect(() => {
    if (!isOpen || !currentStory || stories.length === 0) return

    // Reiniciar progreso
    if (progressRef.current) {
      progressRef.current.style.width = '0%'
    }

    // Animar progreso
    const duration = 5000 // 5 segundos por historia
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / duration) * 100, 100)

      if (progressRef.current) {
        progressRef.current.style.width = `${progress}%`
      }

      if (progress < 100) {
        timeoutRef.current = setTimeout(animate, 16) // ~60fps
      } else {
        // Avanzar a la siguiente historia
        nextStory()
      }
    }

    timeoutRef.current = setTimeout(animate, 16)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isOpen, currentStoryIndex, stories.length])

  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1)
    } else {
      onClose()
    }
  }

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1)
    }
  }

  const isViewingOwnStories = Boolean(user?.id && user.id === userId)

  const handleDeleteCurrentStory = async () => {
    if (!currentStory || deleting) return
    if (!window.confirm('¿Eliminar esta historia? No se puede deshacer.')) return
    setDeleting(true)
    setMenuOpen(false)
    try {
      const res = await apiClient.delete<void>(API_ENDPOINTS.STORIES.DELETE(currentStory.id))
      if (!res.success) return
      const i = currentStoryIndex
      const next = stories.filter((s) => s.id !== currentStory.id)
      setStories(next)
      onStoryDeleted?.()
      if (next.length === 0) {
        onClose()
        return
      }
      setCurrentStoryIndex(Math.min(i, next.length - 1))
    } finally {
      setDeleting(false)
    }
  }

  // Manejar teclas
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextStory()
      } else if (e.key === 'ArrowLeft') {
        prevStory()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentStoryIndex, stories.length])

  if (!isOpen) return null

  // Contenido del modal
  /** Por encima de MobileBottomNav (z-[999999]) — fullscreen debe cubrir todo el viewport en móvil */
  const viewerZ = 'z-[1000001]'

  const modalContent = (
    <>
      {isLoading ? (
        <div className={`fixed inset-0 ${viewerZ} bg-black/90 flex items-center justify-center min-h-[100dvh]`}>
          <div className="text-white">Cargando historias...</div>
        </div>
      ) : !currentStory || !currentFile ? (
        <div className={`fixed inset-0 ${viewerZ} bg-black/90 flex items-center justify-center min-h-[100dvh]`}>
          <div className="text-white">No hay historias disponibles</div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors bg-black/50 backdrop-blur-sm z-[100]"
          >
            ×
          </button>
        </div>
      ) : (
    <div 
      className={`fixed inset-0 ${viewerZ} bg-black flex items-center justify-center min-h-[100dvh]`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
      }}
      onClick={(e) => {
        // Cerrar al hacer click fuera del contenido
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Barra de progreso superior */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 z-50">
        <div className="h-full bg-gradient-to-r from-[#73FFA2] to-[#66DEDB] transition-all duration-100 ease-linear" ref={progressRef} />
      </div>

      {/* Contador de historias */}
      <div className="absolute top-4 left-4 text-white text-sm z-50">
        {currentStoryIndex + 1} / {stories.length}
      </div>

      {/* Menú propias historias + cerrar */}
      <div className="absolute top-4 right-4 z-[120] flex items-center gap-1">
        {isViewingOwnStories && currentStory && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Opciones de historia"
              aria-expanded={menuOpen}
              disabled={deleting}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 min-w-[180px] rounded-lg border border-gray-600 bg-[#1E1E1E] py-1 shadow-xl">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleDeleteCurrentStory()
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-white/10"
                  disabled={deleting}
                >
                  Eliminar esta historia
                </button>
              </div>
            )}
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors bg-black/50 backdrop-blur-sm"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Información del autor - Arriba izquierda, para todas las historias */}
      <div className="absolute top-16 left-4 z-50 flex items-center gap-3 text-white bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 max-w-[calc(100%-8rem)]">
        {currentStory.author.avatar && (
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#73FFA2] flex-shrink-0">
            <Image
              src={currentStory.author.avatar}
              alt={currentStory.author.firstName || 'Usuario'}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {currentStory.author.firstName} {currentStory.author.lastName}
          </div>
          {currentStory.description && (
            <div className="text-sm text-gray-300 truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {currentStory.description}
            </div>
          )}
        </div>
      </div>

      {/* Contenido de la historia - Centrado en pantalla, sin fondo negro extra */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Navegación izquierda */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            prevStory()
          }}
          className="absolute left-4 z-50 text-white w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors bg-black/50 backdrop-blur-sm"
          disabled={currentStoryIndex === 0}
          style={{ opacity: currentStoryIndex === 0 ? 0.3 : 1 }}
          aria-label="Historia anterior"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Contenedor principal centrado - Ocupa toda la pantalla visible */}
        <div 
          className="relative flex h-[100dvh] w-[100vw] max-w-full max-h-[100dvh] items-center justify-center md:h-[100vh] md:max-h-none"
          onClick={(e) => e.stopPropagation()}
        >
          {currentStory.storyType === 'WISHLIST' && currentStory.productId ? (
            <div className="flex h-full max-h-[100dvh] w-full max-w-full items-center justify-center p-4 md:max-h-[600px] md:max-w-[380px]">
              <WishlistStoryCard
                story={currentStory}
                onClose={onClose}
              />
            </div>
          ) : (
            <div className="relative flex h-full max-h-[100dvh] w-full max-w-[100vw] items-center justify-center md:max-h-[90vh] md:max-w-[90vw]">
              {currentFile.fileType === 'image' ? (
                <Image
                  src={currentFile.fileUrl}
                  alt={currentStory.title}
                  fill
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <video
                  src={currentFile.fileUrl}
                  autoPlay
                  loop
                  muted
                  className="max-h-[100dvh] max-w-[100vw] object-contain md:max-h-[90vh] md:max-w-[90vw]"
                />
              )}
            </div>
          )}
        </div>

        {/* Navegación derecha */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            nextStory()
          }}
          className="absolute right-4 z-50 text-white w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors bg-black/50 backdrop-blur-sm"
          aria-label="Siguiente historia"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
      )}
    </>
  )

  // Renderizar usando portal para que esté fuera del árbol del nav
  if (typeof window === 'undefined') {
    return null
  }

  return createPortal(modalContent, document.body)
}

