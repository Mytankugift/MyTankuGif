'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { PosterDetailContent } from './poster-detail-content'
import { TANKU_CARD_SHELL_RADIUS_PX } from '@/lib/utils/tanku-card-radius'
import {
  tankuOrderModalBackdropClass,
  tankuOrderModalPanelClass,
  TANKU_POSTER_MODAL_Z,
} from '@/lib/ui/tanku-modal-surface'

/** Por encima del bottom nav móvil (999999), alineado con ProductModal */
const POSTER_MODAL_Z = TANKU_POSTER_MODAL_Z

interface PosterDetailModalProps {
  isOpen: boolean
  posterId: string | null
  initialPosterData?: {
    id: string
    imageUrl: string
    videoUrl?: string | null
    description?: string | null
    likesCount: number
    commentsCount: number
    createdAt: string
    isLiked?: boolean
    author: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
      username: string | null
      avatar: string | null
    }
  } | null
  onClose: () => void
  onPostDeleted?: (posterId: string) => void
  onPostUpdated?: (posterId: string, updates: { likesCount?: number; isLiked?: boolean; commentsCount?: number }) => void
  onAuthRequired?: () => void
  /** Feed / perfil: acciones junto a cerrar (⋯ propias, ir a /posts/:id si no). Landing: omitir. */
  showModalHeaderActions?: boolean
}

interface Comment {
  id: string
  userId: string
  content: string
  parentId: string | null
  likesCount: number
  createdAt: string
  mentions?: string[]
  author: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    username: string | null
    avatar: string | null
  }
}

interface PosterDetail {
  id: string
  imageUrl: string
  videoUrl: string | null
  description: string | null
  likesCount: number
  commentsCount: number
  createdAt: string
  isLiked?: boolean
  comments?: Comment[]
  author: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    username: string | null
    avatar: string | null
  }
}

export function PosterDetailModal({
  isOpen,
  posterId,
  initialPosterData,
  onClose,
  onPostDeleted,
  onPostUpdated,
  onAuthRequired,
  showModalHeaderActions = false,
}: PosterDetailModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const handleClose = () => {
    onClose()
  }

  const handlePostDeleted = (deletedPosterId: string) => {
    if (onPostDeleted) {
      onPostDeleted(deletedPosterId)
    }
    onClose()
  }

  if (!isOpen || !posterId || !mounted) return null

  /** Overlay full-screen: panel y blur por encima del bottom nav en móvil */
  const modal = (
    <div
      className={clsx(
        'fixed inset-0 flex cursor-default items-center justify-center touch-manipulation p-2 sm:px-4 sm:pt-4 md:p-4 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]',
        tankuOrderModalBackdropClass,
      )}
      style={{ zIndex: POSTER_MODAL_Z }}
      role="presentation"
      onClick={handleClose}
    >
      <div
        className={clsx(
          'relative flex w-full max-w-6xl flex-col overflow-hidden',
          tankuOrderModalPanelClass,
          'max-md:h-auto max-md:max-h-[calc(100dvh-3rem-env(safe-area-inset-bottom,0px))]',
          'md:h-[580px] md:max-h-[580px]',
          'lg:h-[680px] lg:max-h-[680px]',
        )}
        style={{ borderRadius: `${TANKU_CARD_SHELL_RADIUS_PX}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {!showModalHeaderActions ? (
          <div className="relative hidden flex-shrink-0 border-b border-white/[0.08] bg-[#171B21] md:block">
            <div className="flex items-center gap-2 px-4 py-3">
              <h2 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-white">
                Publicación
              </h2>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-6 w-6" aria-hidden />
              </button>
            </div>
          </div>
        ) : null}
        <div
          className={clsx(
            'tanku-modal-scrollbar flex min-h-0 flex-col pr-0.5',
            'max-md:min-h-0 max-md:overflow-x-hidden max-md:overflow-y-auto max-md:overscroll-y-contain max-md:touch-pan-y max-md:[-webkit-overflow-scrolling:touch]',
            'md:h-full md:min-h-0 md:flex-1 md:overflow-hidden md:pr-0',
          )}
          style={{
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <PosterDetailContent
            posterId={posterId}
            initialPosterData={initialPosterData}
            isPageView
            showModalHeaderActions={showModalHeaderActions}
            onModalClose={handleClose}
            onPostDeleted={handlePostDeleted}
            onPostUpdated={onPostUpdated}
            onAuthRequired={onAuthRequired}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

