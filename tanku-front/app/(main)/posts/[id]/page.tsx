'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { PosterDetailContent } from '@/components/posters/poster-detail-content'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface PosterDetail {
  id: string
  imageUrl: string
  videoUrl: string | null
  description: string | null
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
}

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const posterId = params.id as string
  const [poster, setPoster] = useState<PosterDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (posterId) {
      loadPoster()
    }
  }, [posterId])

  const loadPoster = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<PosterDetail>(
        `${API_ENDPOINTS.POSTERS.BY_ID(posterId)}?comments=false`
      )
      if (response.success && response.data) {
        setPoster(response.data)
      } else {
        setError('Post no encontrado')
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el post')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  if (error || !poster) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Post no encontrado'}</p>
          <button
            onClick={() => router.push('/feed')}
            className="px-4 py-2 bg-[#73FFA2] text-gray-900 rounded-lg font-semibold hover:bg-[#60D489]"
          >
            Volver al feed
          </button>
        </div>
      </div>
    )
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/posts/${posterId}` : ''
  const authorName = poster.author?.firstName && poster.author?.lastName
    ? `${poster.author.firstName} ${poster.author.lastName}`
    : poster.author?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <PosterDetailContent
        posterId={posterId}
        initialPosterData={{
          id: poster.id,
          imageUrl: poster.imageUrl,
          videoUrl: poster.videoUrl,
          description: poster.description,
          likesCount: poster.likesCount,
          commentsCount: poster.commentsCount,
          createdAt: poster.createdAt,
          isLiked: poster.isLiked,
          author: poster.author,
        }}
        isPageView={true}
      />
    </div>
  )
}

