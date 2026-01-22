'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { PosterDetailContent } from './poster-detail-content'
import { XMarkIcon } from '@heroicons/react/24/outline'

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
  const router = useRouter()

  if (!isOpen || !posterId) return null

  const handleClose = () => {
    onClose()
  }

  const handlePostDeleted = (deletedPosterId: string) => {
    if (onPostDeleted) {
      onPostDeleted(deletedPosterId)
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Botón cerrar fuera del modal, en la esquina */}
      <button
        onClick={handleClose}
        className="fixed top-4 right-4 z-[60] p-3 bg-gray-900/90 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors shadow-lg"
        aria-label="Cerrar"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      <div
        className="bg-gray-900 rounded-lg w-full h-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          width: '95vw',
          maxWidth: '1400px',
          height: '90vh',
          maxHeight: '90vh',
        }}
      >
        {/* Content usando componente compartido */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <PosterDetailContent
            posterId={posterId}
            initialPosterData={initialPosterData}
            isPageView={false}
            onPostDeleted={handlePostDeleted}
            onPostUpdated={onPostUpdated}
          />
        </div>
      </div>
    </div>
  )
}

