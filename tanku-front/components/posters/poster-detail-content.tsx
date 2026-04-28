'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import { ChatBubbleLeftIcon, TrashIcon, EllipsisVerticalIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline'

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
  /** Modal mobile con UX tipo página (acciones debajo + comentarios en sheet) */
  mobilePageLike?: boolean
  /** Cerrar modal (solo vista modal): muestra … y X en la barra superior */
  onModalClose?: () => void
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
  mobilePageLike = false,
  onModalClose,
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
  const [isCommentsSheetOpen, setIsCommentsSheetOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [mediaOrientation, setMediaOrientation] = useState<'landscape' | 'portrait' | 'square'>('square')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

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
        const data = response.data as any
        console.log('   📝 Comentario ID:', data.id)
        console.log('   💬 Contenido:', data.content?.substring(0, 80) + (data.content?.length > 80 ? '...' : ''))
        console.log('   👥 Menciones:', data.mentions?.length || 0, data.mentions || 'ninguna')
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
  const postDateLabel = new Date(poster.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const isOwner = user?.id === poster.author?.id
  const usePageLikeMobile = isPageView || mobilePageLike

  return (
    <div className={`${isPageView ? 'h-full flex flex-col' : 'flex flex-col'} ${isPageView ? '' : 'h-full'}`}>
      {/* Header - Solo en pageView */}
      {isPageView && (
        <div className="flex-shrink-0 border-b border-gray-700 bg-[#191E23]">
          <div className="relative flex items-center justify-between px-4 py-3">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              aria-label="Volver"
            >
              <Image
                src="/icons_tanku/mobile_tanku_menu_ir_atras_Universal.svg"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
                unoptimized
              />
            </button>
            <h2 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-white">Publicación</h2>
            <div className="w-9" />
          </div>
          <div className="flex items-center justify-between border-t border-gray-700/70 px-4 py-2.5">
            <button
              onClick={() => router.push(poster.author.username ? `/profile/${poster.author.username}` : `/profile/${poster.author.id}`)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <UserAvatar user={poster.author} size={36} />
              <div>
                <p className="text-white font-semibold hover:text-[#73FFA2] transition-colors">{authorName}</p>
              </div>
            </button>
            {isOwner && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-white hover:opacity-80 transition-opacity"
                  title="Más opciones"
                >
                  <EllipsisVerticalIcon className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 bg-[#2A3036] rounded-xl shadow-lg border border-[#73FFA2]/40 z-20 px-3 py-2">
                    <button
                      onClick={() => {
                        handleDelete()
                        setShowMenu(false)
                      }}
                      disabled={isDeleting}
                      className="whitespace-nowrap text-sm text-white hover:text-[#73FFA2] transition-colors disabled:opacity-50"
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
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-700 p-4 bg-[linear-gradient(180deg,#20262D_0%,#191E23_100%)]">
          <button
            onClick={() => router.push(poster.author.username ? `/profile/${poster.author.username}` : `/profile/${poster.author.id}`)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <UserAvatar user={poster.author} size={40} />
            <div>
              <p className="text-white font-semibold hover:text-[#73FFA2] transition-colors">{authorName}</p>
              <p className="text-gray-400 text-sm">
                {postDateLabel}
              </p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                title="Más opciones"
                aria-expanded={showMenu}
                aria-haspopup="true"
              >
                <EllipsisVerticalIcon className="h-5 w-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-700 bg-gray-800 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/posts/${posterId}`)
                      setShowMenu(false)
                    }}
                    className="w-full whitespace-nowrap px-3 py-2 text-left text-xs text-white transition-colors hover:bg-gray-700"
                  >
                    Ver publicación
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDelete()
                        setShowMenu(false)
                      }}
                      disabled={isDeleting}
                      className="w-full whitespace-nowrap px-3 py-2 text-left text-xs text-red-400 transition-colors hover:bg-red-900/20 disabled:opacity-50"
                    >
                      {isDeleting ? 'Eliminando...' : 'Eliminar publicación'}
                    </button>
                  )}
                </div>
              )}
            </div>
            {onModalClose ? (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  onModalClose()
                }}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden ${isPageView ? '' : 'overflow-y-auto'} bg-[#11161B]`}>
        {/* Media */}
        <div className="lg:w-3/5 bg-black flex items-center justify-center min-h-[58dvh] lg:min-h-0 lg:h-full relative">
          {poster.videoUrl ? (
            <video
              src={poster.videoUrl}
              controls
              onLoadedMetadata={(e) => {
                const el = e.currentTarget
                if (!el.videoWidth || !el.videoHeight) return
                if (el.videoWidth > el.videoHeight) setMediaOrientation('landscape')
                else if (el.videoHeight > el.videoWidth) setMediaOrientation('portrait')
                else setMediaOrientation('square')
              }}
              className={`max-h-full max-w-full ${
                usePageLikeMobile
                  ? mediaOrientation === 'portrait'
                    ? 'h-full w-auto object-contain'
                    : 'w-full h-auto object-contain'
                  : 'w-full h-full object-contain'
              }`}
            />
          ) : (
            <Image
              src={poster.imageUrl}
              alt="Post"
              width={1200}
              height={1200}
              onLoadingComplete={(img) => {
                if (!img.naturalWidth || !img.naturalHeight) return
                if (img.naturalWidth > img.naturalHeight) setMediaOrientation('landscape')
                else if (img.naturalHeight > img.naturalWidth) setMediaOrientation('portrait')
                else setMediaOrientation('square')
              }}
              className={`${
                usePageLikeMobile
                  ? mediaOrientation === 'portrait'
                    ? 'h-full w-auto max-w-full object-contain'
                    : 'w-full h-auto max-h-full object-contain'
                  : 'w-full h-full max-w-full max-h-full object-contain'
              }`}
              unoptimized={isRemoteImageSrc(poster.imageUrl)}
              style={isPageView ? undefined : {
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
              }}
            />
          )}
        </div>

        {/* Bloque inferior en mobile page view: acciones + fecha + descripción */}
        {usePageLikeMobile && (
          <div className="lg:hidden border-t border-gray-700 bg-[#191E23] px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`flex items-center gap-1.5 transition-colors ${
                    poster.isLiked ? 'text-red-500' : 'text-white hover:text-red-500'
                  }`}
                >
                  <Image
                    src={poster.isLiked ? '/icons_tanku/tanku_megusta_relleno.svg' : '/icons_tanku/tanku_megusta_lineas_azul.svg'}
                    alt={poster.isLiked ? 'Quitar me gusta' : 'Me gusta'}
                    width={20}
                    height={20}
                    className="w-5 h-5 object-contain"
                    unoptimized
                  />
                  <span className="text-sm font-semibold">{poster.likesCount}</span>
                </button>
                <button
                  onClick={() => setIsCommentsSheetOpen(true)}
                  className="flex items-center gap-1.5 text-white hover:text-[#73FFA2] transition-colors"
                >
                  <ChatBubbleLeftIcon className="w-5 h-5" />
                  <span className="text-sm font-semibold">{poster.commentsCount}</span>
                </button>
              </div>
              <p className="text-xs text-gray-400">{postDateLabel}</p>
            </div>
            {poster.description ? (
              <p className="text-white text-sm leading-relaxed">{poster.description}</p>
            ) : null}
          </div>
        )}

        {/* Details */}
        <div className={`${usePageLikeMobile ? 'hidden lg:flex' : 'flex'} lg:w-2/5 flex-col min-h-0 h-full lg:border-l border-t lg:border-t-0 border-gray-700 bg-[#191E23]`}>
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
                <Image
                  src="/icons_tanku/tanku_card_compartir_verde.svg"
                  alt="Compartir"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                  unoptimized
                />
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
                <Image
                  src="/icons_tanku/tanku_card_compartir_verde.svg"
                  alt="Compartir"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                  unoptimized
                />
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
                    <div className="absolute inset-y-0 right-0 z-[1] hidden w-0 items-center justify-end lg:flex lg:w-9">
                      <EmojiPickerButton
                        onEmojiSelect={(emoji) => {
                          setCommentText((prev) => prev + emoji)
                        }}
                      />
                    </div>
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

      {usePageLikeMobile && isMounted
        ? createPortal(
            <div
              className={`fixed inset-0 z-[1000002] bg-black/60 transition-opacity duration-200 lg:hidden ${
                isCommentsSheetOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
              }`}
              onClick={() => setIsCommentsSheetOpen(false)}
              role="presentation"
            >
              <div
                className={`absolute bottom-0 left-0 right-0 h-[72dvh] rounded-t-2xl border-t border-white/10 bg-[#191E23] transition-transform duration-200 flex flex-col ${
                  isCommentsSheetOpen ? 'translate-y-0' : 'translate-y-full'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setIsCommentsSheetOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                    aria-label="Cerrar comentarios"
                  >
                    <Image
                      src="/icons_tanku/mobile_tanku_menu_ir_atras_Universal.svg"
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                      unoptimized
                    />
                  </button>
                  <h3 className="text-sm font-semibold text-white">Comentarios</h3>
                  <div className="w-9" />
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-4 p-4">
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
                </div>

                {token && (
                  <div className="border-t border-gray-700 bg-[#191E23] p-4 pb-[max(1rem,calc(1rem+env(safe-area-inset-bottom,0px)))]">
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
                        <div className="relative min-w-0 flex-1">
                          <UserMentionAutocomplete
                            value={commentText}
                            onChange={setCommentText}
                            placeholder="Escribe un comentario..."
                            disabled={isCommenting}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!commentText.trim() || isCommenting}
                          className="w-10 h-10 flex items-center justify-center bg-[#73FFA2] hover:bg-[#66e891] text-black rounded-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}

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

