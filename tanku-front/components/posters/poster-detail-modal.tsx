'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PosterDetailContent } from './poster-detail-content'

/** Por encima del nav (z-40–50) y del bottom nav móvil (z-100); fuera de <main overflow> vía portal */
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
    avatar: string | null
  }
}

export function PosterDetailModal({ isOpen, posterId, initialPosterData, onClose, onPostDeleted, onPostUpdated }: PosterDetailModalProps) {
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

  /** Espacio para MobileBottomNav solo &lt; md (barra fija + safe area) */
  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 p-4 max-md:pb-[max(1rem,calc(4.75rem+env(safe-area-inset-bottom,0px)))]"
      style={{ zIndex: POSTER_MODAL_Z }}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="flex w-[95vw] max-w-[1400px] flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-2xl max-md:max-h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] md:h-[90vh] md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto min-h-0">
          <PosterDetailContent
            posterId={posterId}
            initialPosterData={initialPosterData}
            isPageView={false}
            onModalClose={handleClose}
            onPostDeleted={handlePostDeleted}
            onPostUpdated={onPostUpdated}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

