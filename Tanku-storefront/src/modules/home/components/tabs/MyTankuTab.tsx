"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { fetchFeedPosts } from "@modules/home/components/actions/get-feed-post"
import { usePersonalInfo } from "@lib/context"
import { Heart } from "@medusajs/icons"
import Link from "next/link"

interface FeedPost {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  customer_avatar?: string
  title?: string
  description?: string
  image_url?: string
  video_url?: string
  likes_count: number
  comments_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface MyTankuTabProps {
  products: any[]
  customerId: string
}

export default function MyTankuTab({ customerId }: MyTankuTabProps) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const { personalInfo } = usePersonalInfo()

  useEffect(() => {
    if (customerId) {
      loadFeedPosts()
    }
  }, [customerId])

  const loadFeedPosts = async () => {
    setLoading(true)
    try {
      const feedPosts = await fetchFeedPosts(customerId)
      // El backend ya devuelve los posts ordenados por fecha (más recientes primero)
      setPosts(feedPosts || [])
    } catch (error) {
      console.error("Error loading feed posts:", error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-white text-lg font-medium mb-2">No hay publicaciones aún</h3>
        <p className="text-gray-400 text-sm">
          Las publicaciones tuyas y de tus amigos aparecerán aquí
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {posts.map((post) => {
        const isOwnPost = post.customer_id === customerId
        const displayName = post.customer_name || post.customer_email?.split("@")[0] || "Usuario"
        const avatarUrl = post.customer_avatar || "/feed/avatar.png"
        
        return (
          <div
            key={post.id}
            className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 sm:p-6 hover:border-[#73FFA2] transition-all duration-300"
          >
            {/* Header del post */}
            <div className="flex items-center gap-3 mb-4">
              <Link href={isOwnPost ? "/profile" : `/profile`}>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 border-2 border-[#73FFA2] flex-shrink-0">
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={isOwnPost ? "/profile" : `/profile`}>
                  <h3 className="text-white font-semibold text-sm sm:text-base hover:text-[#73FFA2] transition-colors truncate">
                    {displayName}
                  </h3>
                </Link>
                <p className="text-gray-400 text-xs">
                  {new Date(post.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Contenido del post */}
            {post.title && (
              <h4 className="text-white font-medium text-base sm:text-lg mb-2">
                {post.title}
              </h4>
            )}
            
            {post.description && (
              <p className="text-gray-300 text-sm sm:text-base mb-4 whitespace-pre-wrap">
                {post.description}
              </p>
            )}

            {/* Media del post */}
            {(post.image_url || post.video_url) && (
              <div className="w-full rounded-lg overflow-hidden mb-4 bg-gray-900">
                {post.image_url && (
                  <div className="relative w-full aspect-video">
                    <Image
                      src={post.image_url}
                      alt={post.title || "Publicación"}
                      fill
                      className="object-contain"
                      unoptimized={post.image_url.startsWith('blob:') || post.image_url.startsWith('data:')}
                    />
                  </div>
                )}
                
                {post.video_url && !post.image_url && (
                  <div className="relative w-full aspect-video bg-gray-900 flex items-center justify-center">
                    <video
                      src={post.video_url}
                      controls
                      className="w-full h-full max-h-96"
                    />
                  </div>
                )}

                {post.video_url && post.image_url && (
                  <div className="relative">
                    <div className="relative w-full aspect-video">
                      <Image
                        src={post.image_url}
                        alt={post.title || "Publicación"}
                        fill
                        className="object-contain"
                        unoptimized={post.image_url.startsWith('blob:') || post.image_url.startsWith('data:')}
                      />
                    </div>
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 rounded-full p-2">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Acciones del post */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <button className="flex items-center gap-2 text-gray-300 hover:text-[#73FFA2] transition-colors">
                <Heart className="w-5 h-5" />
                <span className="text-sm">{post.likes_count || 0}</span>
              </button>
              
              <button className="flex items-center gap-2 text-gray-300 hover:text-[#73FFA2] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm">{post.comments_count || 0}</span>
              </button>

              <button className="text-gray-300 hover:text-[#73FFA2] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
