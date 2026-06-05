'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { StoryDTO } from '@/lib/hooks/use-stories'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { WishlistStoryCard } from './wishlist-story-card'
import {
  filterPlayableStories,
  getStoryPrimaryFile,
  isStoryVideoFileType,
  isWishlistStoryItem,
  sortStoriesForPlayback,
  storyMediaDurationMs,
  getStoryViewerPrefersMuted,
} from '@/lib/stories/story-viewer-timing'

interface StoryViewerProps {
  userId: string
  userQueue: string[]
  isOpen: boolean
  onClose: () => void
  onStoryDeleted?: () => void
}

export function StoryViewer({
  userId,
  userQueue,
  isOpen,
  onClose,
  onStoryDeleted,
}: StoryViewerProps) {
  const { user } = useAuthStore()
  const prefersMuted = getStoryViewerPrefersMuted()
  const [currentUserId, setCurrentUserId] = useState(userId)
  const [stories, setStories] = useState<StoryDTO[]>([])
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [mediaDurationMs, setMediaDurationMs] = useState(5000)
  const [durationReady, setDurationReady] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pendingLastStoryRef = useRef(false)
  const loadGenerationRef = useRef(0)
  const emptySkipCountRef = useRef(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const storiesRef = useRef(stories)
  const currentStoryIndexRef = useRef(currentStoryIndex)
  const currentUserIdRef = useRef(currentUserId)

  useEffect(() => {
    storiesRef.current = stories
  }, [stories])
  useEffect(() => {
    currentStoryIndexRef.current = currentStoryIndex
  }, [currentStoryIndex])
  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

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

  useEffect(() => {
    if (isOpen) {
      setCurrentUserId(userId)
      setCurrentStoryIndex(0)
      setProgressPercent(0)
      setStories([])
      setIsLoading(true)
      pendingLastStoryRef.current = false
      emptySkipCountRef.current = 0
    }
  }, [isOpen, userId])

  const userQueueRef = useRef(userQueue)
  useEffect(() => {
    userQueueRef.current = userQueue
  }, [userQueue])

  const loadStories = useCallback(async () => {
    if (!currentUserId) return
    const targetUserId = currentUserId
    const generation = ++loadGenerationRef.current
    setIsLoading(true)
    try {
      const response = await apiClient.get<StoryDTO[]>(
        API_ENDPOINTS.STORIES.BY_USER(targetUserId)
      )
      if (generation !== loadGenerationRef.current) return

      const playable = sortStoriesForPlayback(
        filterPlayableStories(response.success && response.data ? response.data : [])
      )

      if (playable.length === 0) {
        const queue = userQueueRef.current
        const idx = queue.indexOf(targetUserId)
        if (idx >= 0 && idx < queue.length - 1) {
          emptySkipCountRef.current += 1
          if (emptySkipCountRef.current <= queue.length) {
            setStories([])
            setCurrentUserId(queue[idx + 1]!)
            return
          }
        }
        setStories([])
        onClose()
        return
      }

      setStories(playable)
      emptySkipCountRef.current = 0
      if (!pendingLastStoryRef.current) {
        setCurrentStoryIndex(0)
      }
    } catch (error) {
      if (generation !== loadGenerationRef.current) return
      console.error('Error cargando stories:', error)
      setStories([])
    } finally {
      if (generation === loadGenerationRef.current) {
        setIsLoading(false)
      }
    }
  }, [currentUserId, onClose])

  useEffect(() => {
    if (isOpen && currentUserId) {
      void loadStories()
    }
  }, [isOpen, currentUserId, loadStories])

  useEffect(() => {
    if (pendingLastStoryRef.current && stories.length > 0 && !isLoading) {
      setCurrentStoryIndex(stories.length - 1)
      pendingLastStoryRef.current = false
    }
  }, [stories, isLoading])

  const currentStory = stories[currentStoryIndex]
  const currentFile = useMemo(
    () => (currentStory ? getStoryPrimaryFile(currentStory) : null),
    [currentStory]
  )
  const isWishlistStory = currentStory ? isWishlistStoryItem(currentStory) : false
  const isVideoStory =
    currentFile != null &&
    currentStory != null &&
    !isWishlistStory &&
    isStoryVideoFileType(currentFile.fileType)

  const queueIndex = userQueue.indexOf(currentUserId)
  const canGoPrev = currentStoryIndex > 0 || queueIndex > 0

  const goToNextUser = useCallback(() => {
    const idx = userQueue.indexOf(currentUserIdRef.current)
    if (idx >= 0 && idx < userQueue.length - 1) {
      setProgressPercent(0)
      setStories([])
      setIsLoading(true)
      setCurrentUserId(userQueue[idx + 1]!)
      setCurrentStoryIndex(0)
      pendingLastStoryRef.current = false
      return true
    }
    onClose()
    return false
  }, [userQueue, onClose])

  const goToPrevUser = useCallback(() => {
    const idx = userQueue.indexOf(currentUserIdRef.current)
    if (idx > 0) {
      pendingLastStoryRef.current = true
      setProgressPercent(0)
      setStories([])
      setIsLoading(true)
      setCurrentUserId(userQueue[idx - 1]!)
      setCurrentStoryIndex(0)
      return true
    }
    return false
  }, [userQueue])

  const lastAdvanceAtRef = useRef(0)

  const nextStory = useCallback(() => {
    const now = Date.now()
    if (now - lastAdvanceAtRef.current < 400) return
    lastAdvanceAtRef.current = now

    setProgressPercent(0)
    const idx = currentStoryIndexRef.current
    const list = storiesRef.current
    if (idx < list.length - 1) {
      setCurrentStoryIndex(idx + 1)
    } else {
      goToNextUser()
    }
  }, [goToNextUser])

  const prevStory = useCallback(() => {
    setProgressPercent(0)
    const idx = currentStoryIndexRef.current
    if (idx > 0) {
      setCurrentStoryIndex(idx - 1)
    } else {
      goToPrevUser()
    }
  }, [goToPrevUser])

  const nextStoryRef = useRef(nextStory)
  useEffect(() => {
    nextStoryRef.current = nextStory
  }, [nextStory])

  useEffect(() => {
    setProgressPercent(0)
    if (!isOpen || !currentStory) {
      setDurationReady(false)
      return
    }

    if (isWishlistStory) {
      setMediaDurationMs(storyMediaDurationMs('image', null))
      setDurationReady(true)
      return
    }

    if (!currentFile) {
      setDurationReady(false)
      return
    }

    if (!isVideoStory) {
      setMediaDurationMs(storyMediaDurationMs(currentFile.fileType, currentFile.duration))
      setDurationReady(true)
      return
    }

    if (currentFile.duration && currentFile.duration > 0) {
      setMediaDurationMs(
        storyMediaDurationMs(currentFile.fileType, currentFile.duration)
      )
      setDurationReady(true)
      return
    }

    setDurationReady(false)
  }, [
    isOpen,
    currentStory?.id,
    currentFile?.id,
    currentFile?.fileUrl,
    isWishlistStory,
    isVideoStory,
  ])

  const handleVideoLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video || !currentFile) return
    setMediaDurationMs(
      storyMediaDurationMs(currentFile.fileType, currentFile.duration, video.duration)
    )
    setDurationReady(true)
    video.muted = prefersMuted
    if (!prefersMuted) {
      video.volume = 1
    }
    void video.play().catch(() => {})
  }, [currentFile, prefersMuted])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVideoStory) return

    const onTimeUpdate = () => {
      if (!video.duration || !Number.isFinite(video.duration)) return
      setProgressPercent(Math.min((video.currentTime / video.duration) * 100, 100))
    }

    const onEnded = () => {
      nextStoryRef.current()
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', onEnded)
    }
  }, [isVideoStory, currentStory?.id, currentFile?.fileUrl])

  /** Timer solo para imagen / wishlist — los videos avanzan con `ended` */
  useEffect(() => {
    if (!isOpen || !currentStory || stories.length === 0 || !durationReady || isVideoStory) {
      return
    }

    setProgressPercent(0)
    const duration = mediaDurationMs
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / duration) * 100, 100)
      setProgressPercent(progress)

      if (progress < 100) {
        timeoutRef.current = setTimeout(animate, 16)
      } else {
        nextStoryRef.current()
      }
    }

    timeoutRef.current = setTimeout(animate, 16)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [
    isOpen,
    currentStoryIndex,
    currentStory?.id,
    stories.length,
    durationReady,
    mediaDurationMs,
    currentUserId,
    isVideoStory,
  ])

  const isViewingOwnStories = Boolean(user?.id && user.id === currentUserId)

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
        goToNextUser()
        return
      }
      setCurrentStoryIndex(Math.min(i, next.length - 1))
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextStory()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevStory()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, nextStory, prevStory, onClose])

  if (!isOpen) return null

  const viewerZ = 'z-[1000001]'

  const modalContent = (
    <>
      {isLoading ? (
        <div
          className={`fixed inset-0 ${viewerZ} flex min-h-[100dvh] items-center justify-center bg-black/90`}
        >
          <div className="text-white">Cargando historias...</div>
        </div>
      ) : !currentStory || (!isWishlistStory && !currentFile) ? (
        <div
          className={`fixed inset-0 ${viewerZ} flex min-h-[100dvh] items-center justify-center bg-black/90`}
        >
          <div className="text-white">No hay historias disponibles</div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-[100] flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          className={`fixed inset-0 ${viewerZ} flex min-h-[100dvh] items-center justify-center bg-black`}
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
            if (e.target === e.currentTarget) {
              onClose()
            }
          }}
        >
          <div className="absolute left-0 right-0 top-0 z-50 flex gap-1 px-2 pb-1 pt-2">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25"
              >
                <div
                  className="h-full bg-gradient-to-r from-[#73FFA2] to-[#66DEDB] transition-[width] duration-75 ease-linear"
                  style={{
                    width:
                      index < currentStoryIndex
                        ? '100%'
                        : index === currentStoryIndex
                          ? `${progressPercent}%`
                          : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="absolute right-4 top-4 z-[120] flex items-center gap-1">
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className="absolute left-4 top-12 z-50 flex max-w-[calc(100%-8rem)] items-center gap-3 rounded-full bg-black/50 px-4 py-2 text-white backdrop-blur-sm">
            {currentStory.author.avatar && (
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#73FFA2]">
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
              <div className="truncate font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {currentStory.author.firstName} {currentStory.author.lastName}
              </div>
              {currentStory.description && (
                <div
                  className="truncate text-sm text-gray-300"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {currentStory.description}
                </div>
              )}
            </div>
          </div>

          <div className="relative flex h-full w-full items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                prevStory()
              }}
              className="absolute left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              disabled={!canGoPrev}
              style={{ opacity: canGoPrev ? 1 : 0.3 }}
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

            <div
              className="relative flex h-[100dvh] w-[100vw] max-h-[100dvh] max-w-full items-center justify-center md:h-[100vh] md:max-h-none"
              onClick={(e) => e.stopPropagation()}
            >
              {isWishlistStory ? (
                <div className="flex h-full max-h-[100dvh] w-full max-w-full items-center justify-center p-4 md:max-h-[600px] md:max-w-[380px]">
                  <WishlistStoryCard story={currentStory} onClose={onClose} />
                </div>
              ) : (
                <div className="relative flex h-full max-h-[100dvh] w-full max-w-[100vw] items-center justify-center md:max-h-[90vh] md:max-w-[90vw]">
                  {!isVideoStory && currentFile ? (
                    <Image
                      src={currentFile.fileUrl}
                      alt={currentStory.title}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : currentFile ? (
                    <video
                      key={`${currentStory.id}-${currentFile.id}`}
                      ref={videoRef}
                      src={currentFile.fileUrl}
                      autoPlay
                      playsInline
                      muted={prefersMuted}
                      className="max-h-[100dvh] max-w-[100vw] object-contain md:max-h-[90vh] md:max-w-[90vw]"
                      onLoadedMetadata={handleVideoLoadedMetadata}
                    />
                  ) : null}
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                nextStory()
              }}
              className="absolute right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
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

  if (typeof window === 'undefined') {
    return null
  }

  return createPortal(modalContent, document.body)
}
