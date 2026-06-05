'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { PosterDetailContent } from './poster-detail-content'
import { TANKU_CARD_SHELL_RADIUS_PX } from '@/lib/utils/tanku-card-radius'
import {
  tankuOrderModalBackdropClass,
  tankuOrderModalPanelClass,
} from '@/lib/ui/tanku-modal-surface'

/** Por encima del bottom nav en móvil */
const POSTER_MODAL_Z = 10050

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

export function PosterDetailModal({ isOpen, posterId, initialPosterData, onClose, onPostDeleted, onPostUpdated, onAuthRequired }: PosterDetailModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

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

  /** Espacio para MobileBottomNav solo en móvil cuando el modal no ocupa pantalla completa */
  const modal = (
    <div
      className="fixed inset-0 isolate flex items-center justify-center p-2 sm:px-4 sm:pt-4 md:p-4 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
      style={{ zIndex: POSTER_MODAL_Z }}
      role="presentation"
    >
      <div
        className={clsx('absolute inset-0', tankuOrderModalBackdropClass)}
        aria-hidden
        onClick={handleClose}
      />

      <div
        className={clsx(
          'relative z-10 flex w-full max-w-6xl flex-col overflow-hidden',
          tankuOrderModalPanelClass,
          'max-md:max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom,0px))]',
          'md:h-[580px] md:max-h-[580px]',
          'lg:h-[680px] lg:max-h-[680px]',
        )}
        style={{ borderRadius: `${TANKU_CARD_SHELL_RADIUS_PX}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={clsx(
            'flex min-h-0 flex-1 flex-col',
            'max-md:max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom,0px))] max-md:overflow-y-auto max-md:overflow-x-hidden max-md:custom-scrollbar',
            'md:h-full md:overflow-hidden',
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

