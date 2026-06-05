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
  groupPlayableStoriesByUser,
  isStoryVideoFileType,
  isWishlistStoryItem,
  sortStoriesForPlayback,
  storyMediaDurationMs,
  getStoryViewerPrefersMuted,
} from '@/lib/stories/story-viewer-timing'
import { prefetchWishlistStoryProduct } from '@/lib/stories/wishlist-story-product'

interface StoryViewerProps {
  userId: string
  userQueue: string[]
  isOpen: boolean
  onClose: () => void
  onStoryDeleted?: () => void
  /** Historias ya cargadas en el feed — caché instantánea al abrir */
  seedStories?: StoryDTO[]
}

function mergeIntoCache(cache: Map<string, StoryDTO[]>, stories: StoryDTO[]) {
  for (const [uid, list] of groupPlayableStoriesByUser(stories)) {
    const existing = cache.get(uid) ?? []
    const byId = new Map(existing.map((s) => [s.id, s]))
    for (const s of list) byId.set(s.id, s)
    cache.set(uid, sortStoriesForPlayback([...byId.values()]))
  }
}

export function StoryViewer({
  userId,
  userQueue,
  isOpen,
  onClose,
  onStoryDeleted,
  seedStories,
}: StoryViewerProps) {
  const { user } = useAuthStore()
  const prefersMuted = getStoryViewerPrefersMuted()
  const [currentUserId, setCurrentUserId] = useState(userId)
  const [stories, setStories] = useState<StoryDTO[]>([])
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pendingLastStoryRef = useRef(false)
  const loadGenerationRef = useRef(0)
  const emptySkipCountRef = useRef(0)
  const storiesCacheRef = useRef<Map<string, StoryDTO[]>>(new Map())
  const activeProgressRef = useRef<HTMLDivElement | null>(null)
  const playbackSessionRef = useRef(0)
  const advancingRef = useRef(false)
  const nextStoryRef = useRef<(manual?: boolean) => void>(() => {})
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
    if (seedStories?.length) {
      mergeIntoCache(storiesCacheRef.current, seedStories)
    }
  }, [seedStories])

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
      pendingLastStoryRef.current = false
      emptySkipCountRef.current = 0
      const cached = storiesCacheRef.current.get(userId)
      if (cached?.length) {
        setStories(cached)
        setIsLoading(false)
      } else {
        setStories([])
        setIsLoading(true)
      }
    }
  }, [isOpen, userId])

  const userQueueRef = useRef(userQueue)
  useEffect(() => {
    userQueueRef.current = userQueue
  }, [userQueue])

  const fetchUserStories = useCallback(
    async (targetUserId: string, options?: { background?: boolean }) => {
      if (!targetUserId) return
      const background = options?.background ?? false
      const generation = ++loadGenerationRef.current

      if (!background) {
        const cached = storiesCacheRef.current.get(targetUserId)
        if (cached?.length && targetUserId === currentUserIdRef.current) {
          setStories(cached)
          setIsLoading(false)
        } else if (!cached?.length) {
          setIsLoading(true)
        }
      }

      try {
        const response = await apiClient.get<StoryDTO[]>(
          API_ENDPOINTS.STORIES.BY_USER(targetUserId)
        )
        if (generation !== loadGenerationRef.current) return

        const playable = sortStoriesForPlayback(
          filterPlayableStories(response.success && response.data ? response.data : [])
        )

        if (playable.length === 0) {
          storiesCacheRef.current.delete(targetUserId)
          if (targetUserId !== currentUserIdRef.current) return

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

        storiesCacheRef.current.set(targetUserId, playable)
        emptySkipCountRef.current = 0

        if (targetUserId === currentUserIdRef.current) {
          setStories(playable)
          setCurrentStoryIndex((prev) =>
            pendingLastStoryRef.current
              ? prev
              : Math.min(prev, Math.max(0, playable.length - 1))
          )
        }
      } catch (error) {
        if (generation !== loadGenerationRef.current) return
        console.error('Error cargando stories:', error)
        if (targetUserId === currentUserIdRef.current) {
          setStories([])
        }
      } finally {
        if (
          generation === loadGenerationRef.current &&
          !background &&
          targetUserId === currentUserIdRef.current
        ) {
          setIsLoading(false)
        }
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen && currentUserId) {
      void fetchUserStories(currentUserId)
    }
  }, [isOpen, currentUserId, fetchUserStories])

  useEffect(() => {
    if (!isOpen || !currentUserId) return
    const idx = userQueue.indexOf(currentUserId)
    const neighbors = [userQueue[idx + 1], userQueue[idx - 1]].filter(Boolean) as string[]
    for (const neighborId of neighbors) {
      if (!storiesCacheRef.current.get(neighborId)?.length) {
        void fetchUserStories(neighborId, { background: true })
      }
    }
  }, [isOpen, currentUserId, userQueue, fetchUserStories])

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

  const mediaDurationMs = useMemo(() => {
    if (!currentStory) return 5000
    if (isWishlistStory) return storyMediaDurationMs('image', null)
    if (!currentFile) return 5000
    if (isVideoStory && videoDurationMs != null) return videoDurationMs
    return storyMediaDurationMs(currentFile.fileType, currentFile.duration)
  }, [currentStory, currentFile, isWishlistStory, isVideoStory, videoDurationMs])

  const durationReady = useMemo(() => {
    if (!currentStory) return false
    if (isWishlistStory) return true
    if (!currentFile) return false
    if (!isVideoStory) return true
    if (currentFile.duration != null && currentFile.duration > 0) return true
    return videoDurationMs != null
  }, [currentStory, currentFile, isWishlistStory, isVideoStory, videoDurationMs])

  const queueIndex = userQueue.indexOf(currentUserId)
  const canGoPrev = currentStoryIndex > 0 || queueIndex > 0

  useEffect(() => {
    setMediaReady(false)
    setVideoDurationMs(null)
    advancingRef.current = false
    if (activeProgressRef.current) {
      activeProgressRef.current.style.transform = 'scaleX(0)'
    }
  }, [currentStory?.id, currentFile?.fileUrl])

  const stopPlayback = useCallback(() => {
    playbackSessionRef.current += 1
  }, [])

  const safeAdvance = useCallback(() => {
    if (advancingRef.current) return
    advancingRef.current = true
    stopPlayback()
    nextStoryRef.current()
    window.setTimeout(() => {
      advancingRef.current = false
    }, 100)
  }, [stopPlayback])

  const goToNextUser = useCallback(() => {
    const idx = userQueue.indexOf(currentUserIdRef.current)
    if (idx >= 0 && idx < userQueue.length - 1) {
      const nextId = userQueue[idx + 1]!
      const cached = storiesCacheRef.current.get(nextId)
      stopPlayback()
      pendingLastStoryRef.current = false
      setCurrentUserId(nextId)
      setCurrentStoryIndex(0)
      if (cached?.length) {
        setStories(cached)
        setIsLoading(false)
      } else {
        setStories([])
        setIsLoading(true)
      }
      return true
    }
    onClose()
    return false
  }, [userQueue, onClose, stopPlayback])

  const goToPrevUser = useCallback(() => {
    const idx = userQueue.indexOf(currentUserIdRef.current)
    if (idx > 0) {
      const prevId = userQueue[idx - 1]!
      const cached = storiesCacheRef.current.get(prevId)
      stopPlayback()
      pendingLastStoryRef.current = true
      setCurrentUserId(prevId)
      setCurrentStoryIndex(0)
      if (cached?.length) {
        setStories(cached)
        setIsLoading(false)
      } else {
        setStories([])
        setIsLoading(true)
      }
      return true
    }
    return false
  }, [userQueue, stopPlayback])

  const nextStory = useCallback(
    (manual = false) => {
      if (manual) {
        stopPlayback()
      }
      const idx = currentStoryIndexRef.current
      const list = storiesRef.current
      if (idx < list.length - 1) {
        setCurrentStoryIndex(idx + 1)
      } else {
        goToNextUser()
      }
    },
    [goToNextUser, stopPlayback]
  )

  useEffect(() => {
    nextStoryRef.current = nextStory
  }, [nextStory])

  const prevStory = useCallback(() => {
    stopPlayback()
    const idx = currentStoryIndexRef.current
    if (idx > 0) {
      setCurrentStoryIndex(idx - 1)
    } else {
      goToPrevUser()
    }
  }, [goToPrevUser, stopPlayback])

  const handleVideoLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video || !currentFile) return
    setVideoDurationMs(
      storyMediaDurationMs(currentFile.fileType, currentFile.duration, video.duration)
    )
    video.muted = prefersMuted
    if (!prefersMuted) video.volume = 1
    void video.play().catch(() => {})
  }, [currentFile, prefersMuted])

  const handleVideoCanPlay = useCallback(() => {
    setMediaReady(true)
  }, [])

  const handleWishlistMediaReady = useCallback(() => {
    setMediaReady(true)
  }, [])

  /** Progreso sincronizado: rAF + transform (sin CSS animation ni doble avance) */
  useEffect(() => {
    if (!isOpen || !currentStory || !durationReady || !mediaReady) return

    const session = ++playbackSessionRef.current
    const storyId = currentStory.id

    const setProgress = (ratio: number) => {
      if (session !== playbackSessionRef.current) return
      const el = activeProgressRef.current
      if (el) el.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`
    }

    if (isVideoStory) {
      const video = videoRef.current
      if (!video) return

      let rafId = 0
      const tick = () => {
        if (session !== playbackSessionRef.current) return
        if (storiesRef.current[currentStoryIndexRef.current]?.id !== storyId) return

        const dur = video.duration
        if (dur && Number.isFinite(dur) && dur > 0) {
          setProgress(video.currentTime / dur)
        }

        if (video.ended) {
          setProgress(1)
          safeAdvance()
          return
        }

        rafId = requestAnimationFrame(tick)
      }

      rafId = requestAnimationFrame(tick)

      return () => {
        cancelAnimationFrame(rafId)
      }
    }

    const duration = mediaDurationMs
    const start = performance.now()
    let rafId = 0

    const tick = (now: number) => {
      if (session !== playbackSessionRef.current) return
      if (storiesRef.current[currentStoryIndexRef.current]?.id !== storyId) return

      const ratio = (now - start) / duration
      setProgress(ratio)

      if (ratio >= 1) {
        setProgress(1)
        safeAdvance()
        return
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [
    isOpen,
    currentStory?.id,
    durationReady,
    mediaReady,
    mediaDurationMs,
    isVideoStory,
    safeAdvance,
  ])

  /** Precargar la siguiente historia (media + producto wishlist) */
  useEffect(() => {
    const next = stories[currentStoryIndex + 1]
    if (!next || typeof window === 'undefined') return

    if (isWishlistStoryItem(next)) {
      prefetchWishlistStoryProduct(next)
      return
    }

    const file = getStoryPrimaryFile(next)
    if (!file?.fileUrl || isStoryVideoFileType(file.fileType)) return
    const img = new window.Image()
    img.src = file.fileUrl
  }, [currentStoryIndex, stories])

  /** Precargar productos wishlist del usuario actual al abrir su sesión */
  useEffect(() => {
    if (!isOpen || stories.length === 0) return
    for (const story of stories) {
      if (isWishlistStoryItem(story)) {
        prefetchWishlistStoryProduct(story)
      }
    }
  }, [isOpen, stories])

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
      storiesCacheRef.current.set(currentUserId, next)
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
        nextStory(true)
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
  const showShell = stories.length > 0 && currentStory && (isWishlistStory || currentFile)
  const showInitialLoad = isLoading && !showShell

  const modalContent = (
    <>
      {showInitialLoad ? (
        <div
          className={`fixed inset-0 ${viewerZ} flex min-h-[100dvh] items-center justify-center bg-black/90`}
        >
          <div className="text-white">Cargando historias...</div>
        </div>
      ) : !showShell ? (
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
                {index < currentStoryIndex ? (
                  <div className="h-full w-full bg-gradient-to-r from-[#73FFA2] to-[#66DEDB]" />
                ) : index === currentStoryIndex ? (
                  <div
                    ref={activeProgressRef}
                    className="h-full w-full origin-left bg-gradient-to-r from-[#73FFA2] to-[#66DEDB]"
                    style={{ transform: 'scaleX(0)' }}
                  />
                ) : null}
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
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#73FFA2] border-t-transparent" />
                </div>
              )}
              {isWishlistStory ? (
                <div className="flex h-full max-h-[100dvh] w-full max-w-full items-center justify-center p-4 md:max-h-[600px] md:max-w-[380px]">
                  <WishlistStoryCard
                    story={currentStory}
                    onClose={onClose}
                    onMediaReady={handleWishlistMediaReady}
                  />
                </div>
              ) : (
                <div className="relative flex h-full max-h-[100dvh] w-full max-w-[100vw] items-center justify-center md:max-h-[90vh] md:max-w-[90vw]">
                  {!isVideoStory && currentFile ? (
                    <Image
                      key={`${currentStory.id}-${currentFile.id}`}
                      src={currentFile.fileUrl}
                      alt={currentStory.title}
                      fill
                      priority
                      className="object-contain"
                      unoptimized
                      onLoad={() => setMediaReady(true)}
                      onError={() => setMediaReady(true)}
                    />
                  ) : currentFile ? (
                    <video
                      key={`${currentStory.id}-${currentFile.id}`}
                      ref={videoRef}
                      src={currentFile.fileUrl}
                      autoPlay
                      playsInline
                      muted={prefersMuted}
                      preload="auto"
                      className="max-h-[100dvh] max-w-[100vw] object-contain md:max-h-[90vh] md:max-w-[90vw]"
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      onCanPlay={handleVideoCanPlay}
                    />
                  ) : null}
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                nextStory(true)
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
