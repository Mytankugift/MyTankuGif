'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useStories, type StoryDTO } from '@/lib/hooks/use-stories'
import { useAuthStore } from '@/lib/stores/auth-store'
import { StoryViewer } from './story-viewer'
import { CreateStoryModal } from './create-story-modal'

interface StoriesCarouselProps {
  className?: string
  stories?: StoryDTO[]
  /** Feed: `false` hasta pulsar Explorar; omitir en otras pantallas (comportamiento anterior) */
  explorarActivated?: boolean
  /** Feed: al hacer scroll se oculta la franja (y en móvil también el chip «Tu historia» + publicar). */
  showStoriesStrip?: boolean
  /** Desktop feed nav: redirige a sugerencias en /friends en lugar de abrir historias */
  friendsSuggestionsHref?: string
}

/**
 * `stories` undefined → datos del hook `useStories`.
 * `stories` como array → lista inyectada (p. ej. prefetch `/feed/init`); **no** debe ocultar el chip
 * móvil «Tu historia»: eso solo dependía de si había sesión (bug previo al pasar `feedInit.stories`).
 *
 * Móvil (&lt; md): sin sidebar → avatar + “+” publicar en la franja si hay sesión.
 * Desktop (md+): misma lista que antes; el “+” solo en sidebar.
 */
export function StoriesCarousel({
  className = '',
  stories: customStories,
  explorarActivated,
  showStoriesStrip = true,
  friendsSuggestionsHref,
}: StoriesCarouselProps) {
  const router = useRouter()
  const { feedStories, fetchFeedStories, isLoading } = useStories()
  const { user } = useAuthStore()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const showMobileOwnSlot = Boolean(user)

  /** `[]` del prefetch es truthy en JS y rompía el fallback al hook; solo usar prefetch si trae ítems. */
  const hasPrefetchedStories =
    Array.isArray(customStories) && customStories.length > 0
  const storiesToUse = hasPrefetchedStories ? customStories : feedStories

  const storiesByUser = useMemo(() => {
    const grouped = new Map<string, StoryDTO[]>()

    storiesToUse.forEach((story) => {
      const uid = story.userId
      if (!grouped.has(uid)) {
        grouped.set(uid, [])
      }
      grouped.get(uid)!.push(story)
    })

    return Array.from(grouped.entries()).map(([userId, st]) => ({
      userId,
      stories: st.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      author: st[0]?.author,
      hasNewStories: st.some((s) => s.viewsCount === 0),
    }))
  }, [storiesToUse])

  const othersStories = useMemo(() => {
    if (!user?.id) return storiesByUser
    return storiesByUser.filter((g) => g.userId !== user.id)
  }, [storiesByUser, user?.id])

  const ownGroup = useMemo(
    () => (user?.id ? storiesByUser.find((g) => g.userId === user.id) : undefined),
    [storiesByUser, user?.id]
  )

  /** Tu historia siempre primero (móvil y desktop) */
  const orderedForCarousel = useMemo(() => {
    if (!user?.id) return storiesByUser
    const own = storiesByUser.find((g) => g.userId === user.id)
    const others = storiesByUser.filter((g) => g.userId !== user.id)
    return own ? [own, ...others] : others
  }, [storiesByUser, user?.id])

  const viewerUserQueue = useMemo(
    () => orderedForCarousel.map((g) => g.userId),
    [orderedForCarousel]
  )

  useEffect(() => {
    if (!hasPrefetchedStories) {
      fetchFeedStories()
    }
  }, [fetchFeedStories, hasPrefetchedStories])

  const handleStoryClick = (userId: string) => {
    setSelectedUserId(userId)
    setIsViewerOpen(true)
  }

  const handleDesktopRedirect = useCallback(() => {
    if (friendsSuggestionsHref) {
      router.push(friendsSuggestionsHref)
    }
  }, [friendsSuggestionsHref, router])

  const handleCloseViewer = () => {
    setIsViewerOpen(false)
    setSelectedUserId(null)
    if (!hasPrefetchedStories) {
      setTimeout(() => {
        fetchFeedStories()
      }, 500)
    }
  }

  const renderStoryAvatarButton = (
    userId: string,
    author: StoryDTO['author'] | undefined,
    hasNewStories: boolean,
    label: string,
    redirectOnClick?: () => void
  ) => {
    const avatar = author?.avatar || '/default-avatar.png'
    const isCurrentUser = userId === user?.id
    const ownRingOk = explorarActivated !== false
    const showMintRing = hasNewStories && (!isCurrentUser || ownRingOk)

    return (
      <button
        key={`${userId}-avatar`}
        type="button"
        onClick={() => (redirectOnClick ? redirectOnClick() : handleStoryClick(userId))}
        className="flex shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5"
      >
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full p-0.5"
            style={{
              background: showMintRing
                ? 'linear-gradient(90deg, rgba(115, 255, 162, 0.3) 0%, rgba(102, 222, 219, 0.3) 100%)'
                : 'rgb(75 85 99)',
            }}
          >
            <div className="h-full w-full rounded-full bg-[#1E1E1E]" />
          </div>
          <div className="relative h-14 w-14 overflow-hidden rounded-full sm:h-16 sm:w-16 md:h-[68px] md:w-[68px]">
            <Image
              src={avatar}
              alt={author?.firstName || 'Usuario'}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
        <span
          className="max-w-[80px] truncate text-center sm:max-w-[96px]"
          style={{
            fontFamily: 'var(--font-plus-jakarta), "Plus Jakarta Sans", sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            color: '#7E8B9A',
          }}
        >
          {label}
        </span>
      </button>
    )
  }

  /** Solo móvil: avatar del sidebar + “+” publicar (no hay rail con avatar). */
  const renderMobileOwnChip = () => {
    if (!user) return null

    const avatar = user.profile?.avatar || '/default-avatar.png'
    const ownRingOk = explorarActivated !== false
    const showMintRing = Boolean(ownGroup?.hasNewStories && ownRingOk)

    return (
      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16">
          <button
            type="button"
            onClick={() => handleStoryClick(user.id)}
            className="relative flex flex-col items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#73FFA2]"
            aria-label="Ver tu historia"
          >
            <div
              className="absolute inset-0 rounded-full p-0.5"
              style={{
                background: showMintRing
                  ? 'linear-gradient(90deg, rgba(115, 255, 162, 0.3) 0%, rgba(102, 222, 219, 0.3) 100%)'
                  : 'rgb(75 85 99)',
              }}
            >
              <div className="h-full w-full rounded-full bg-[#1E1E1E]" />
            </div>
            <div className="relative h-14 w-14 overflow-hidden rounded-full sm:h-16 sm:w-16">
              {user.profile?.avatar ? (
                <Image
                  src={avatar}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized={avatar.startsWith('http')}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-800 text-lg font-bold text-gray-400">
                  {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setCreateModalOpen(true)
            }}
            className="absolute -bottom-0.5 -right-0.5 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-[#191E23] bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] shadow-lg transition-transform hover:scale-110"
            title="Publicar historia"
            aria-label="Publicar historia"
          >
            <Image
              src="/icons_tanku/tanku_%2B_avatar.svg"
              alt=""
              width={14}
              height={14}
              className="pointer-events-none h-3.5 w-3.5 object-contain"
              unoptimized
            />
          </button>
        </div>
        <span
          className="max-w-[80px] truncate text-center sm:max-w-[96px]"
          style={{
            fontFamily: 'var(--font-plus-jakarta), "Plus Jakarta Sans", sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            color: '#7E8B9A',
          }}
        >
          Tu historia
        </span>
      </div>
    )
  }

  const flexClasses = `snap-x snap-mandatory items-center gap-1.5 overflow-x-auto py-0.5 sm:gap-2 md:gap-2.5 ${className}`

  const skeletonCircle = (key: React.Key) => (
    <div
      key={key}
      className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-gray-700 sm:h-16 sm:w-16 md:h-[68px] md:w-[68px]"
    />
  )

  if (isLoading && storiesByUser.length === 0 && !hasPrefetchedStories) {
    return (
      <>
        <div className={`flex md:hidden ${flexClasses} scrollbar-hide`}>
          {showMobileOwnSlot && renderMobileOwnChip()}
          {[...Array(showMobileOwnSlot ? 4 : 5)].map((_, i) => skeletonCircle(i))}
        </div>
        <div className={`hidden md:flex ${flexClasses}`}>
          {[...Array(5)].map((_, i) => skeletonCircle(`d-${i}`))}
        </div>
        <CreateStoryModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onStoryCreated={() => {
            setCreateModalOpen(false)
            fetchFeedStories()
          }}
        />
      </>
    )
  }

  if (storiesByUser.length === 0 && !showMobileOwnSlot) {
    return null
  }

  if (storiesByUser.length === 0 && showMobileOwnSlot) {
    return (
      <>
        <div className={`flex md:hidden ${flexClasses} scrollbar-hide`}>
          {renderMobileOwnChip()}
        </div>
        <CreateStoryModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onStoryCreated={() => {
            setCreateModalOpen(false)
            fetchFeedStories()
          }}
        />
        {isViewerOpen && selectedUserId && viewerUserQueue.length > 0 && (
          <StoryViewer
            userId={selectedUserId}
            userQueue={viewerUserQueue}
            isOpen={isViewerOpen}
            onClose={handleCloseViewer}
            onStoryDeleted={() => fetchFeedStories()}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className={`flex md:hidden ${flexClasses} scrollbar-hide`}>
        {showMobileOwnSlot && renderMobileOwnChip()}
        {othersStories.map(({ userId, author, hasNewStories }) =>
          renderStoryAvatarButton(userId, author, hasNewStories, author?.firstName || 'Usuario')
        )}
      </div>

      {/* Desktop / tablet md+: misma prioridad que móvil — tu historia primero */}
      <div className={`hidden md:flex ${flexClasses} scrollbar-hide`}>
        {orderedForCarousel.map(({ userId, author, hasNewStories }) =>
          renderStoryAvatarButton(
            userId,
            author,
            hasNewStories,
            userId === user?.id ? 'Tu historia' : author?.firstName || 'Usuario',
            friendsSuggestionsHref ? handleDesktopRedirect : undefined
          )
        )}
      </div>

      {isViewerOpen && selectedUserId && viewerUserQueue.length > 0 && (
        <StoryViewer
          userId={selectedUserId}
          userQueue={viewerUserQueue}
          isOpen={isViewerOpen}
          onClose={handleCloseViewer}
          onStoryDeleted={() => fetchFeedStories()}
        />
      )}

      <CreateStoryModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onStoryCreated={() => {
          setCreateModalOpen(false)
          fetchFeedStories()
        }}
      />
    </>
  )
}
