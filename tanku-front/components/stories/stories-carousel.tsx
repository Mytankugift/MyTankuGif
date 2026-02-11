'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useStories, type StoryDTO } from '@/lib/hooks/use-stories'
import { useAuthStore } from '@/lib/stores/auth-store'
import { StoryViewer } from './story-viewer'

interface StoriesCarouselProps {
  className?: string
  stories?: StoryDTO[] // Prop opcional para historias personalizadas (ej: wishlistStories)
}

export function StoriesCarousel({ className = '', stories: customStories }: StoriesCarouselProps) {
  const { feedStories, fetchFeedStories, isLoading } = useStories()
  const { user } = useAuthStore()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  // Usar historias personalizadas si se proporcionan, sino usar feedStories
  const storiesToUse = customStories || feedStories

  // Agrupar stories por usuario
  const storiesByUser = useMemo(() => {
    const grouped = new Map<string, StoryDTO[]>()
    
    storiesToUse.forEach((story) => {
      const userId = story.userId
      if (!grouped.has(userId)) {
        grouped.set(userId, [])
      }
      grouped.get(userId)!.push(story)
    })

    return Array.from(grouped.entries()).map(([userId, stories]) => ({
      userId,
      stories: stories.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      author: stories[0]?.author,
      hasNewStories: stories.some((s) => s.viewsCount === 0),
    }))
  }, [storiesToUse])

  // Cargar stories al montar solo si no se proporcionan historias personalizadas
  useEffect(() => {
    if (!customStories) {
      fetchFeedStories()
    }
  }, [fetchFeedStories, customStories])

  const handleStoryClick = (userId: string) => {
    setSelectedUserId(userId)
    setIsViewerOpen(true)
  }

  const handleCloseViewer = () => {
    setIsViewerOpen(false)
    setSelectedUserId(null)
    // Refrescar stories después de ver solo si no estamos usando historias personalizadas
    if (!customStories) {
      setTimeout(() => {
        fetchFeedStories()
      }, 500)
    }
  }

  if (isLoading && storiesByUser.length === 0 && !customStories) {
    return (
      <div className={`flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-700 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (storiesByUser.length === 0) {
    return null
  }

  return (
    <>
      <div className={`flex gap-1 sm:gap-1.5 md:gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory scrollbar-hide ${className}`}>
        {storiesByUser.map(({ userId, author, hasNewStories }) => {
          const avatar = author?.avatar || '/default-avatar.png'
          const isCurrentUser = userId === user?.id

          return (
            <button
              key={userId}
              onClick={() => handleStoryClick(userId)}
              className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer group"
            >
              <div className="relative">
                {/* Borde animado si tiene historias nuevas */}
                <div
                  className={`absolute inset-0 rounded-full ${
                    hasNewStories
                      ? 'bg-gradient-to-r from-[#73FFA2] to-[#66DEDB] p-0.5 animate-pulse'
                      : 'bg-gray-600 p-0.5'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-[#1E1E1E]" />
                </div>
                {/* Avatar - Tamaño reducido */}
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-[#1E1E1E]">
                  <Image
                    src={avatar}
                    alt={author?.firstName || 'Usuario'}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-200"
                    unoptimized
                  />
                </div>
              </div>
              {/* Nombre del usuario */}
              <span className="text-xs text-gray-400 group-hover:text-[#73FFA2] transition-colors max-w-[60px] sm:max-w-[80px] truncate">
                {isCurrentUser ? 'Tú' : author?.firstName || 'Usuario'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Story Viewer */}
      {isViewerOpen && selectedUserId && (
        <StoryViewer
          userId={selectedUserId}
          isOpen={isViewerOpen}
          onClose={handleCloseViewer}
        />
      )}
    </>
  )
}

