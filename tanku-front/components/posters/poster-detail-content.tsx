'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { UserMentionAutocomplete } from './user-mention-autocomplete'
import { UserAvatar } from '@/components/shared/user-avatar'
import { CommentItem } from './comment-item'
import { SharePostModal } from './share-post-modal'
import { EmojiPickerButton } from './emoji-picker-button'
import Image from 'next/image'
import { HeartIcon, ChatBubbleLeftIcon, TrashIcon, ShareIcon, ArrowLeftIcon, EllipsisVerticalIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

interface PosterDetailContentProps {
  posterId: string
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
  isPageView?: boolean
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
    username: string | null
    avatar: string | null
  }
}

export function PosterDetailContent({ 
  posterId, 
  initialPosterData, 
  isPageView = false,
  onPostDeleted,
  onPostUpdated 
}: PosterDetailContentProps) {
  const router = useRouter()
  const { token, user } = useAuthStore()
  const [poster, setPoster] = useState<PosterDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [isCommenting, setIsCommenting] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commentsPage, setCommentsPage] = useState(0)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [totalComments, setTotalComments] = useState(0)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [mentionedUsers, setMentionedUsers] = useState<Record<string, {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    username: string | null
    avatar: string | null
  }>>({})
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string; authorId: string } | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Inicializar con datos del feed si están disponibles
  useEffect(() => {
    if (posterId) {
      if (initialPosterData) {
        setPoster({
          id: initialPosterData.id,
          imageUrl: initialPosterData.imageUrl,
          videoUrl: initialPosterData.videoUrl || null,
          description: initialPosterData.description || null,
          likesCount: initialPosterData.likesCount,
          commentsCount: initialPosterData.commentsCount,
          createdAt: initialPosterData.createdAt,
          isLiked: initialPosterData.isLiked,
          comments: [],
          author: initialPosterData.author,
        })
        loadComments(0)
      } else {
        loadPoster()
      }
    }
  }, [posterId, initialPosterData])

  const loadPoster = async () => {
    if (!posterId) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<PosterDetail>(`${API_ENDPOINTS.POSTERS.BY_ID(posterId)}?comments=false`)
      if (response.success && response.data) {
        setPoster(response.data)
        loadComments(0)
      } else {
        setError('Error al cargar el post')
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el post')
    } finally {
      setIsLoading(false)
    }
  }

  const loadComments = async (page: number = 0) => {
    if (!posterId || isLoadingComments) return
    setIsLoadingComments(true)
    try {
      const response = await apiClient.get<{
        comments: Comment[]
        hasMore: boolean
        total: number
      }>(`${API_ENDPOINTS.POSTERS.BY_ID(posterId)}/comments?page=${page}&limit=20`)

      if (response.success && response.data) {
        setPoster(prev => prev ? {
          ...prev,
          comments: page === 0 ? response.data.comments : [...(prev.comments || []), ...response.data.comments],
        } : null)
        setHasMoreComments(response.data.hasMore)
        setTotalComments(response.data.total)
        setCommentsPage(page)
        await loadMentionedUsers(response.data.comments)
      }
    } catch (err: any) {
      console.error('Error cargando comentarios:', err)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const loadMentionedUsers = async (comments: Comment[]) => {
    const mentionedIds = new Set<string>()
    comments.forEach(comment => {
      if (comment.mentions && Array.isArray(comment.mentions)) {
        comment.mentions.forEach((id: string) => mentionedIds.add(id))
      }
    })

    const currentMentionedUserIds = Object.keys(mentionedUsers)
    const newMentionIdsToFetch = Array.from(mentionedIds).filter(id => !currentMentionedUserIds.includes(id))

    if (newMentionIdsToFetch.length === 0) return

    try {
      const usersResponse = await apiClient.post<{ users: any[] }>(
        API_ENDPOINTS.USERS.GET_BY_IDS,
        { userIds: newMentionIdsToFetch }
      )
      if (usersResponse.success && usersResponse.data) {
        const newUsersMap = usersResponse.data.users.reduce((acc, user) => {
          acc[user.id] = user
          return acc
        }, {} as Record<string, any>)
        setMentionedUsers(prev => ({ ...prev, ...newUsersMap }))
      }
    } catch (error) {
      console.error('Error cargando usuarios mencionados:', error)
    }
  }

  const handleLike = async () => {
    if (!poster || !token || isLiking) return

    setIsLiking(true)
    try {
      const response = await apiClient.post<import('@/types/api-responses').LikeResponse>(
        API_ENDPOINTS.POSTERS.REACT(poster.id),
        { reactionType: 'like' }
      )

      if (response.success && response.data) {
        const data = response.data
        const newLikesCount = data.liked
          ? poster.likesCount + 1
          : poster.likesCount - 1

        setPoster(prev => prev ? {
          ...prev,
          isLiked: data.liked,
          likesCount: newLikesCount,
        } : null)

        if (onPostUpdated) {
          onPostUpdated(poster.id, {
            likesCount: newLikesCount,
            isLiked: data.liked,
          })
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al dar like')
    } finally {
      setIsLiking(false)
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poster || !commentText.trim() || isCommenting) return

    console.log('\n📝 ===== FRONTEND: ENVIAR COMENTARIO =====')
    console.log('💬 Contenido original:', commentText)
    console.log('📏 Longitud:', commentText.length, 'caracteres')

    setIsCommenting(true)
    try {
      // Convertir todas las menciones @username a @{userId} antes de enviar
      // Esto asegura que incluso si la búsqueda asíncrona no terminó, las menciones se conviertan
      let finalContent = commentText.trim()
      
      // Buscar todas las menciones @username que no estén ya convertidas
      const usernameMentionRegex = /@([a-zA-Z0-9_-]+)(?=\s|$|@|,|\.|!|\?)/g
      const matches = Array.from(finalContent.matchAll(usernameMentionRegex))
      
      console.log(`\n🔍 Menciones @username encontradas: ${matches.length}`)
      matches.forEach((m, i) => console.log(`   ${i + 1}. @${m[1]}`))
      
      // Para cada match, verificar si ya está en formato @{userId}
      // Si no, buscar el usuario y convertir
      for (const match of matches) {
        const username = match[1]
        const matchIndex = match.index || 0
        const beforeMatch = finalContent.substring(Math.max(0, matchIndex - 1), matchIndex)
        
        // Si ya está en formato @{userId}, saltar
        if (beforeMatch.endsWith('{')) {
          console.log(`\n   @${username}: ✅ Ya está en formato @{userId}, omitiendo`)
          continue
        }
        
        console.log(`\n   @${username}: 🔍 Buscando usuario...`)
        
        // Buscar el usuario por username
        try {
          const response = await apiClient.get<Array<{
            id: string
            email: string
            firstName: string | null
            lastName: string | null
            username: string | null
          }>>(
            `${API_ENDPOINTS.USERS.SEARCH}?q=${encodeURIComponent(username)}&limit=5`
          )
          
          if (response.success && response.data && response.data.length > 0) {
            // Buscar el usuario que coincida exactamente con el username
            const user = response.data.find(u => 
              u.username?.toLowerCase() === username.toLowerCase()
            ) || response.data[0]
            
            if (user && user.username) {
              console.log(`      ✅ Usuario encontrado: ${user.username} (id: ${user.id})`)
              
              // Reemplazar @username con @{userId}
              const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              finalContent = finalContent.replace(
                new RegExp(`@${escapedUsername}(?=\\s|$|@|,|\\.|!|\\?)`, 'g'),
                `@{${user.id}}`
              )
              
              console.log(`      🔄 Convertido: @${username} → @{${user.id}}`)
            } else {
              console.log(`      ⚠️  Usuario sin username, manteniendo @${username}`)
            }
          } else {
            console.log(`      ❌ No se encontraron usuarios para "${username}"`)
          }
        } catch (err) {
          // Si falla la búsqueda, mantener el @username original
          // El backend lo procesará con el Patrón 4a
          console.log(`      ⚠️  Error en búsqueda, manteniendo @${username} original`)
        }
      }
      
      console.log('\n📤 CONTENIDO FINAL A ENVIAR:')
      console.log('   💬 Texto:', finalContent)
      console.log('   📏 Longitud:', finalContent.length, 'caracteres')
      
      const response = await apiClient.post(
        API_ENDPOINTS.POSTERS.COMMENT(poster.id),
        { 
          content: finalContent,
          parentId: replyingTo?.commentId || undefined
        }
      )
      
      console.log('\n📥 RESPUESTA DEL SERVIDOR:')
      console.log('   ✅ Éxito:', response.success ? 'Sí' : 'No')
      if (response.success && response.data) {
        console.log('   📝 Comentario ID:', response.data.id)
        console.log('   💬 Contenido:', response.data.content?.substring(0, 80) + (response.data.content?.length > 80 ? '...' : ''))
        console.log('   👥 Menciones:', response.data.mentions?.length || 0, response.data.mentions || 'ninguna')
      } else {
        console.log('   ❌ Error:', response.error?.message || 'Error desconocido')
      }
      console.log('========================================\n')

      if (response.success && response.data) {
        setCommentText('')
        setReplyingTo(null)
        
        setPoster(prev => prev ? {
          ...prev,
          commentsCount: prev.commentsCount + 1,
        } : null)

        await loadComments(0)
        
        if (onPostUpdated && poster) {
          onPostUpdated(poster.id, {
            commentsCount: (poster.commentsCount || 0) + 1,
          })
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al comentar')
    } finally {
      setIsCommenting(false)
    }
  }

  const handleReplyClick = (commentId: string, authorName: string, authorId: string) => {
    // No poner nada en el input, ya hay un indicador abajo que dice "Respondiendo a X persona"
    setCommentText('')
    setReplyingTo({ commentId, authorName, authorId })
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Escribe un comentario..."]') as HTMLInputElement
      if (input) {
        input.focus()
        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  const handleDelete = async () => {
    if (!poster || !token || isDeleting) return

    if (!confirm('¿Estás seguro de que quieres eliminar este post?')) {
      return
    }

    setIsDeleting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
      const response = await fetch(`${API_URL}${API_ENDPOINTS.POSTERS.BY_ID(poster.id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        if (onPostDeleted && poster) {
          onPostDeleted(poster.id)
        }
        if (isPageView) {
          router.push('/feed')
        }
      } else {
        const data = await response.json()
        setError(data.error?.message || 'Error al eliminar el post')
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el post')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleShare = () => {
    if (!poster) return
    setShowShareModal(true)
  }

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2]"></div>
      </div>
    )
  }

  if (error && !poster) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadPoster}
          className="mt-4 px-4 py-2 bg-[#73FFA2] text-gray-900 rounded-lg font-semibold"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!poster) return null

  const authorName = poster.author?.firstName && poster.author?.lastName
    ? `${poster.author.firstName} ${poster.author.lastName}`
    : poster.author?.email?.split('@')[0] || 'Usuario'

  const isOwner = user?.id === poster.author?.id

  return (
    <div className={`${isPageView ? 'h-full flex flex-col' : 'flex flex-col'} ${isPageView ? '' : 'h-full'}`}>
      {/* Header - Solo en pageView */}
      {isPageView && (
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
              aria-label="Volver"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <button
              onClick={() => router.push(poster.author.username ? `/profile/${poster.author.username}` : `/profile/${poster.author.id}`)}
              className="flex items-center gap-4 hover:opacity-80 transition-opacity"
            >
              <UserAvatar user={poster.author} size={40} />
              <div>
                <p className="text-white font-semibold hover:text-[#73FFA2] transition-colors">{authorName}</p>
                <p className="text-gray-400 text-sm">
                  {new Date(poster.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Más opciones"
                >
                  <EllipsisVerticalIcon className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                    <button
                      onClick={() => {
                        handleDelete()
                        setShowMenu(false)
                      }}
                      disabled={isDeleting}
                      className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? 'Eliminando...' : 'Eliminar publicación'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header para modal (no pageView) */}
      {!isPageView && (
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
          <button
            onClick={() => router.push(poster.author.username ? `/profile/${poster.author.username}` : `/profile/${poster.author.id}`)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <UserAvatar user={poster.author} size={40} />
            <div>
              <p className="text-white font-semibold hover:text-[#73FFA2] transition-colors">{authorName}</p>
              <p className="text-gray-400 text-sm">
                {new Date(poster.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Más opciones"
              >
                <EllipsisVerticalIcon className="w-5 h-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                  <button
                    onClick={() => {
                      router.push(`/posts/${posterId}`)
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors"
                  >
                    Abrir en nueva página
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => {
                        handleDelete()
                        setShowMenu(false)
                      }}
                      disabled={isDeleting}
                      className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? 'Eliminando...' : 'Eliminar publicación'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden ${isPageView ? '' : 'overflow-y-auto'}`}>
        {/* Media */}
        <div className="lg:w-3/5 bg-black flex items-center justify-center min-h-[300px] lg:min-h-0 lg:h-full relative">
          {poster.videoUrl ? (
            <video
              src={poster.videoUrl}
              controls
              className="w-full h-full max-h-full object-contain"
            />
          ) : (
            <Image
              src={poster.imageUrl}
              alt="Post"
              width={1200}
              height={1200}
              className="w-full h-full max-w-full max-h-full object-contain"
              unoptimized={poster.imageUrl.startsWith('http')}
              style={{ 
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
              }}
            />
          )}
          
          {/* Contadores de like y comentarios en esquina inferior izquierda */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm transition-colors ${
                poster.isLiked ? 'text-red-500' : 'text-white hover:text-red-500'
              }`}
            >
              {poster.isLiked ? (
                <HeartSolidIcon className="w-5 h-5" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
              <span className="font-semibold text-sm">{poster.likesCount}</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm text-white">
              <ChatBubbleLeftIcon className="w-5 h-5" />
              <span className="font-semibold text-sm">{poster.commentsCount}</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:w-2/5 flex flex-col min-h-0 h-full lg:border-l border-t lg:border-t-0 border-gray-700">
          {/* Description */}
          {poster.description && (
            <div className="flex-shrink-0 p-4 border-b border-gray-700 relative">
              <p className="text-white pr-12">{poster.description}</p>
              {/* Botón compartir en esquina derecha */}
              <button
                onClick={handleShare}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                title="Compartir con amigos"
              >
                <ShareIcon className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* Si no hay descripción, mostrar botón compartir en la parte superior */}
          {!poster.description && (
            <div className="flex-shrink-0 p-4 border-b border-gray-700 relative">
              <button
                onClick={handleShare}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                title="Compartir con amigos"
              >
                <ShareIcon className="w-5 h-5" />
              </button>
            </div>
          )}


          {/* Comments - Con altura definida y scroll interno */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 min-h-0 md:pb-0 pb-24">
            {poster.comments && poster.comments.length > 0 ? (
              <>
                {poster.comments
                  .filter(comment => !comment.parentId)
                  .map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      posterId={poster.id}
                      mentionedUsers={mentionedUsers}
                      allComments={poster.comments || []}
                      onReplyClick={handleReplyClick}
                      onUpdate={() => loadComments(0)}
                      parentComment={null}
                      rootComment={null}
                      isPostOwner={isOwner}
                    />
                  ))}
                {hasMoreComments && (poster?.comments?.length || 0) >= 20 && (
                  <button
                    onClick={() => loadComments(commentsPage + 1)}
                    disabled={isLoadingComments}
                    className="w-full py-2 text-[#73FFA2] hover:text-[#66e891] text-sm font-medium disabled:opacity-50"
                  >
                    {isLoadingComments ? 'Cargando...' : 'Cargar más comentarios'}
                  </button>
                )}
              </>
            ) : isLoadingComments ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#73FFA2]"></div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay comentarios aún</p>
            )}
          </div>

          {/* Comment Form - Siempre visible en la parte inferior, fijo en móvil */}
          {token && (
            <div className="flex-shrink-0 p-4 border-t border-gray-700 space-y-3 bg-gray-900 md:relative fixed md:bottom-auto bottom-0 left-0 right-0 z-10 md:z-auto pb-20 md:pb-4">
              {/* Form */}
              <form onSubmit={handleComment} className="flex gap-3">
                {user && (
                  <UserAvatar 
                    user={{
                      avatar: user.profile?.avatar || null,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      email: user.email,
                    }}
                    size={40}
                    className="flex-shrink-0"
                  />
                )}
                
                <div className="flex-1 flex gap-2">
                  <div className="flex-1 relative">
                    <UserMentionAutocomplete
                      value={commentText}
                      onChange={setCommentText}
                      placeholder="Escribe un comentario..."
                      disabled={isCommenting}
                    />
                    <EmojiPickerButton
                      onEmojiSelect={(emoji) => {
                        setCommentText(prev => prev + emoji)
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!commentText.trim() || isCommenting}
                    className="w-10 h-10 flex items-center justify-center bg-[#73FFA2] hover:bg-[#66e891] text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title={isCommenting ? 'Publicando...' : 'Publicar'}
                  >
                    {isCommenting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <PaperAirplaneIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>

              {/* Respondiendo a */}
              {replyingTo && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>Respondiendo a</span>
                  <span className="text-[#73FFA2] font-semibold">{replyingTo.authorName}</span>
                  <button
                    onClick={() => {
                      setReplyingTo(null)
                      setCommentText('')
                    }}
                    className="text-gray-500 hover:text-white ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de compartir */}
      {poster && (
        <SharePostModal
          isOpen={showShareModal}
          postUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/posts/${poster.id}`}
          postDescription={poster.description}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}

