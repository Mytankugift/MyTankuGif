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
import { CategoryLoginModal } from '@/components/feed/category-login-modal'
import { EmojiPickerButton } from './emoji-picker-button'
import { TankuConfirmModal } from '@/components/ui/tanku-confirm-modal'
import Image from 'next/image'
import { isRemoteImageSrc } from '@/lib/utils/remote-image'
import { TANKU_POSTER_COMMENTS_SHEET_Z, TANKU_POSTER_MODAL_Z } from '@/lib/ui/tanku-modal-surface'
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
  /** Sin sesión: abrir login en lugar de navegar al perfil (p. ej. landing) */
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

export function PosterDetailContent({ 
  posterId, 
  initialPosterData, 
  isPageView = false,
  mobilePageLike = false,
  onModalClose,
  onPostDeleted,
  onPostUpdated,
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
  const [showOwnerPageActionsModal, setShowOwnerPageActionsModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false)
  const [isCommentsSheetOpen, setIsCommentsSheetOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [mediaOrientation, setMediaOrientation] = useState<'landscape' | 'portrait' | 'square'>('square')
  const menuRef = useRef<HTMLDivElement>(null)
  const commentFormRef = useRef<HTMLDivElement>(null)
  const commentsListRef = useRef<HTMLDivElement>(null)
  const loadedPosterIdRef = useRef<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  const syncCommentsCount = (count: number) => {
    setTotalComments(count)
    setPoster((prev) => (prev ? { ...prev, commentsCount: count } : null))
    if (onPostUpdated && posterId) {
      onPostUpdated(posterId, { commentsCount: count })
    }
  }

  // Inicializar solo al cambiar de post (evita resetear el contador si el feed re-renderiza)
  useEffect(() => {
    if (!posterId) {
      loadedPosterIdRef.current = null
      return
    }

    if (loadedPosterIdRef.current === posterId) {
      return
    }

    loadedPosterIdRef.current = posterId

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
      setTotalComments(initialPosterData.commentsCount ?? 0)
      loadComments(0)
    } else {
      loadPoster()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posterId])

  const loadPoster = async () => {
    if (!posterId) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<PosterDetail>(`${API_ENDPOINTS.POSTERS.BY_ID(posterId)}?comments=false`)
      if (response.success && response.data) {
        setPoster(response.data)
        setTotalComments(response.data.commentsCount ?? 0)
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
        const total = response.data.total ?? 0
        setPoster(prev => prev ? {
          ...prev,
          comments: page === 0 ? response.data.comments : [...(prev.comments || []), ...response.data.comments],
          commentsCount: total,
        } : null)
        setHasMoreComments(response.data.hasMore)
        setTotalComments(total)
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
    if (!poster) return
    if (!token) {
      setShowLoginModal(true)
      return
    }
    if (isLiking) return

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

        const optimisticCount = (poster.commentsCount ?? totalComments ?? 0) + 1
        syncCommentsCount(optimisticCount)

        await loadComments(0)
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
      setShowDeletePostConfirm(false)
    }
  }

  const requestDeletePost = () => {
    if (!poster || !token || isDeleting) return
    setShowOwnerPageActionsModal(false)
    setShowMenu(false)
    setShowDeletePostConfirm(true)
  }

  const handleShare = () => {
    if (!poster) return
    if (!token) {
      setShowLoginModal(true)
      return
    }
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

  useEffect(() => {
    if (!showOwnerPageActionsModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowOwnerPageActionsModal(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showOwnerPageActionsModal])

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
  const authorUsername = poster.author.username?.trim() || null
  const accountHandle = authorUsername ? `@${authorUsername}` : null
  const postDateLabel = new Date(poster.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const isOwner = user?.id === poster.author?.id
  const usePageLikeMobile = isPageView || mobilePageLike
  const embeddedInModal = Boolean(onModalClose)
  /** Misma cáscara visual que /messages (tarjeta en page.tsx) */
  const postPageBg = isPageView ? 'bg-[#171B21]' : 'bg-[var(--color-surface-191e23-20)]'
  const postPageDivider = isPageView ? 'border-[#414141]' : 'border-white/10'
  /** Solo divisores internos fuera de vista página (el borde exterior es la tarjeta en /posts/.../page) */
  const innerRule = (classes: string) => (isPageView ? '' : classes)
  /** En modal: layout 2 columnas desde tablet (md) con comentarios fijos abajo-derecha */
  const hideBelowSplit = embeddedInModal ? 'md:hidden' : 'lg:hidden'
  const showFlexAtSplit = embeddedInModal ? 'hidden md:flex' : 'hidden lg:flex'
  const showBlockAtSplit = embeddedInModal ? 'hidden md:block' : 'hidden lg:block'
  const splitRowClass = embeddedInModal ? 'md:flex-row' : 'lg:flex-row'
  const leftColClass = embeddedInModal
    ? 'md:h-full md:min-h-0 md:w-3/5'
    : 'lg:h-full lg:min-h-0 lg:w-3/5'
  const rightColClass = embeddedInModal ? 'md:w-2/5' : 'lg:w-2/5'
  const detailsPanelClass = embeddedInModal
    ? 'hidden md:flex'
    : usePageLikeMobile
      ? 'hidden lg:flex'
      : 'flex'
  const detailsBorderClass = isPageView
    ? embeddedInModal
      ? 'md:border-l md:border-white/[0.08]'
      : 'lg:border-l lg:border-white/[0.08]'
    : innerRule(`border-t lg:border-t-0 lg:border-l ${postPageDivider}`)
  const mediaMinHeightClass = embeddedInModal
    ? 'min-h-0 flex-1 max-md:min-h-[220px] max-md:max-h-[50vh]'
    : 'min-h-[58dvh] lg:min-h-0 lg:flex-1'
  /** Desktop página: imagen centrada en el espacio libre; descripción anclada abajo */
  const pageViewMediaWrapperClass = isPageView
    ? embeddedInModal
      ? 'md:min-h-0'
      : 'lg:min-h-0 lg:flex-1 lg:pt-0'
    : embeddedInModal
      ? 'md:min-h-0'
      : 'lg:min-h-0'

  const profileHref = poster.author.username
    ? `/profile/${poster.author.username}`
    : `/profile/${poster.author.id}`

  const handleGoToProfile = () => {
    router.push(profileHref)
  }

  const displayedCommentsCount = Math.max(poster.commentsCount ?? 0, totalComments)

  const posterMedia = (
    <>
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
              : 'h-full w-full object-contain'
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
              : 'h-full w-full max-h-full max-w-full object-contain'
          }`}
          unoptimized={isRemoteImageSrc(poster.imageUrl)}
          style={
            isPageView
              ? undefined
              : {
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                }
          }
        />
      )}
    </>
  )

  return (
    <div
      className={
        isPageView
          ? embeddedInModal
            ? 'flex min-h-0 flex-col max-md:h-auto md:h-full'
            : 'flex h-full min-h-0 flex-col'
          : 'flex h-full flex-col'
      }
    >
      {/* Header - Solo en pageView */}
      {isPageView && (
        <div className={`flex-shrink-0 ${postPageBg}`}>
          <div className={`flex items-center gap-2 px-4 ${embeddedInModal ? 'py-2' : 'py-3'}`}>
            {embeddedInModal && (
              <button
                type="button"
                onClick={handleGoToProfile}
                className="flex min-w-0 flex-1 items-center justify-start gap-2 overflow-hidden text-left md:hidden"
              >
                <UserAvatar user={poster.author} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold leading-tight text-white">{authorName}</p>
                  {accountHandle ? (
                    <p className="truncate text-[11px] leading-tight text-gray-400">{accountHandle}</p>
                  ) : null}
                </div>
              </button>
            )}
            <button
              type="button"
              onClick={() => (onModalClose ? onModalClose() : router.back())}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10 ${
                embeddedInModal ? 'order-last md:order-none' : ''
              }`}
              aria-label={onModalClose ? 'Cerrar' : 'Volver'}
            >
              {onModalClose ? (
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden />
              ) : (
                <Image
                  src="/icons_tanku/mobile_tanku_menu_ir_atras_Universal.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                  unoptimized
                />
              )}
            </button>
            {!embeddedInModal ? (
              <h2 className="min-w-0 flex-1 text-center text-sm font-semibold text-white">Publicación</h2>
            ) : (
              <div className="hidden min-w-0 flex-1 md:block" aria-hidden />
            )}
            <div className="flex max-w-[min(72%,300px)] shrink-0 items-center gap-2 sm:max-w-[min(65%,340px)]">
              {isOwner && (
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowOwnerPageActionsModal(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
                    title="Más opciones"
                    aria-expanded={showOwnerPageActionsModal}
                    aria-haspopup="dialog"
                  >
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
              <div className={`hidden min-w-0 flex-1 text-right ${showBlockAtSplit}`}>
                <p className="truncate text-sm font-semibold text-white">{authorName}</p>
                {accountHandle ? (
                  <p className="truncate text-xs text-gray-400">{accountHandle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleGoToProfile}
                className={`hidden flex-shrink-0 rounded-full ring-1 ring-white/[0.12] transition-opacity hover:opacity-90 ${showFlexAtSplit}`}
                aria-label={`Perfil de ${authorName}`}
              >
                <UserAvatar user={poster.author} size={36} />
              </button>
            </div>
          </div>
          <div className={`h-px w-full shrink-0 bg-gradient-to-r from-transparent via-white/[0.14] to-transparent ${embeddedInModal ? 'max-md:hidden' : ''}`} aria-hidden />
          {!embeddedInModal && (
            <>
          {/* Debajo del nav: nombre + @ + avatar alineados a la derecha — tablet / móvil */}
          <div className={`flex justify-end px-4 py-2.5 ${hideBelowSplit} ${postPageBg}`}>
            <button
              type="button"
              onClick={handleGoToProfile}
              className="flex max-w-full items-center gap-3 rounded-xl py-1 pl-2 text-right transition-colors hover:bg-white/[0.04]"
            >
              <div className="min-w-0 text-right">
                <p className="truncate font-semibold text-white">{authorName}</p>
                {accountHandle ? (
                  <p className="truncate text-sm text-gray-400">{accountHandle}</p>
                ) : null}
              </div>
              <UserAvatar user={poster.author} size={40} />
            </button>
          </div>
          <div className={`h-px w-full shrink-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent ${hideBelowSplit}`} aria-hidden />
            </>
          )}
        </div>
      )}

      {/* Header para modal (no pageView) */}
      {!isPageView && (
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-700 p-4 bg-[linear-gradient(180deg,#20262D_0%,#191E23_100%)]">
          <button
            onClick={handleGoToProfile}
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
                        requestDeletePost()
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
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${splitRowClass} ${isPageView && !embeddedInModal ? 'lg:min-h-0 lg:flex-1' : ''} ${!embeddedInModal && !isPageView ? 'overflow-y-auto' : ''} ${postPageBg}`}
      >
        {isPageView ? (
          <div className={`flex min-h-0 flex-col ${leftColClass} ${postPageBg} ${embeddedInModal ? '' : 'lg:h-full'}`}>
            <div
              className={`relative flex ${mediaMinHeightClass} items-center justify-center overflow-hidden px-2 pt-2 ${pageViewMediaWrapperClass}`}
            >
              {posterMedia}
            </div>
            {/* Solo desktop (lg+): descripción anclada al pie de la columna izquierda */}
            <div className={`mt-auto hidden shrink-0 ${showBlockAtSplit}`}>
              {poster.description ? (
                <>
                  <div
                    className="mx-4 h-px shrink-0 bg-gradient-to-r from-transparent via-white/[0.14] to-transparent"
                    aria-hidden
                  />
                  <div className="px-4 py-3">
                    <p className="text-sm leading-relaxed text-white lg:text-[15px]">{poster.description}</p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            className={`relative flex min-h-[58dvh] items-center justify-center lg:h-full lg:min-h-0 lg:w-3/5 ${postPageBg}`}
          >
            {posterMedia}
          </div>
        )}

        {/* Bloque inferior en mobile page view: acciones + fecha + descripción */}
        {usePageLikeMobile && (
          <div
            className={`space-y-2.5 px-4 py-3 ${hideBelowSplit} ${postPageBg} ${
              isPageView ? 'border-t border-white/[0.08]' : innerRule(`border-t ${postPageDivider}`)
            }`}
          >
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
                  onClick={() => {
                    if (!token) {
                      setShowLoginModal(true)
                      return
                    }
                    setIsCommentsSheetOpen(true)
                  }}
                  className="flex items-center gap-1.5 text-white hover:text-[#73FFA2] transition-colors"
                >
                  <ChatBubbleLeftIcon className="w-5 h-5" />
                  <span className="text-sm font-semibold">{displayedCommentsCount}</span>
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <p className="text-xs text-gray-400">{postDateLabel}</p>
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-1.5 text-gray-400 transition-colors hover:text-white"
                  title="Compartir con amigos"
                >
                  <Image
                    src="/icons_tanku/tanku_card_compartir_verde.svg"
                    alt="Compartir"
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain"
                    unoptimized
                  />
                </button>
              </div>
            </div>
            {isPageView && poster.description ? (
              <>
                <div
                  className="bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
                  style={{ height: '1px' }}
                  aria-hidden
                />
                <p className="text-sm leading-relaxed text-white">{poster.description}</p>
              </>
            ) : null}
          </div>
        )}

        {/* Details */}
        <div
          className={`${detailsPanelClass} h-full min-h-0 flex-col overflow-hidden ${rightColClass} ${postPageBg} ${detailsBorderClass}`}
        >
          {/* Comments - scroll interno; formulario anclado abajo en columna derecha */}
          <div
            ref={commentsListRef}
            className={`tanku-modal-scrollbar min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch] md:pb-0 pb-24 ${
              isPageView && !embeddedInModal ? 'lg:flex lg:flex-col' : ''
            }`}
          >
            <div
              className={`space-y-4 p-4 ${
                isPageView && !embeddedInModal
                  ? 'lg:flex lg:min-h-full lg:flex-col lg:justify-end'
                  : ''
              }`}
            >
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
                        onUpdate={async () => {
                          await loadComments(0)
                        }}
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
                <p className="text-gray-500 text-center py-8 lg:py-4">No hay comentarios aún</p>
              )}
            </div>
          </div>

          {usePageLikeMobile && (
            <>
              {isPageView && (
                <div
                  className="mx-4 h-px shrink-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
                  aria-hidden
                />
              )}
              <div
                className={`hidden shrink-0 items-center justify-between gap-3 px-4 py-3 ${embeddedInModal ? 'md:flex' : 'lg:flex'} ${innerRule(`border-b ${postPageDivider}`)}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
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
                      className="h-5 w-5 object-contain"
                      unoptimized
                    />
                    <span className="text-sm font-semibold">{poster.likesCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!token) {
                        setShowLoginModal(true)
                        return
                      }
                      const el = commentFormRef.current
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="flex items-center gap-1.5 text-white transition-colors hover:text-[#73FFA2]"
                  >
                    <ChatBubbleLeftIcon className="h-5 w-5" />
                    <span className="text-sm font-semibold">{displayedCommentsCount}</span>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-gray-400">{postDateLabel}</p>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2 text-gray-400 transition-colors hover:text-white"
                    title="Compartir con amigos"
                  >
                    <Image
                      src="/icons_tanku/tanku_card_compartir_verde.svg"
                      alt="Compartir"
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                      unoptimized
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Comment Form - Siempre visible en la parte inferior, fijo en móvil */}
          {token && (
            <div
              ref={commentFormRef}
              className={`fixed bottom-0 left-0 right-0 z-10 flex-shrink-0 space-y-3 p-4 pb-20 md:relative md:bottom-auto md:z-auto md:pb-4 ${postPageBg} ${innerRule(`border-t ${postPageDivider}`)}`}
            >
              {/* Form */}
              <form onSubmit={handleComment} className="flex gap-2">
                <div className="relative min-w-0 flex-1">
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
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#73FFA2] text-white transition-colors hover:bg-[#66e891] disabled:cursor-not-allowed disabled:opacity-50"
                    title={isCommenting ? 'Publicando...' : 'Publicar'}
                  >
                    {isCommenting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <PaperAirplaneIcon className="w-5 h-5" />
                    )}
                  </button>
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
          {!isPageView && poster.description ? (
            <div className={`shrink-0 px-4 pb-4 pt-2 ${postPageBg}`}>
              <div
                className="mb-3 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
                aria-hidden
              />
              <div className="relative">
                <p className="pr-10 text-sm leading-relaxed text-white lg:text-[15px]">{poster.description}</p>
                <button
                  type="button"
                  onClick={handleShare}
                  className="absolute right-0 top-0 p-2 text-gray-400 transition-colors hover:text-white"
                  title="Compartir con amigos"
                >
                  <Image
                    src="/icons_tanku/tanku_card_compartir_verde.svg"
                    alt="Compartir"
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain"
                    unoptimized
                  />
                </button>
              </div>
            </div>
          ) : !isPageView && !poster.description ? (
            <div className={`flex shrink-0 justify-end px-4 pb-4 pt-2 ${postPageBg}`}>
              <button
                type="button"
                onClick={handleShare}
                className="p-2 text-gray-400 transition-colors hover:text-white"
                title="Compartir con amigos"
              >
                <Image
                  src="/icons_tanku/tanku_card_compartir_verde.svg"
                  alt="Compartir"
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain"
                  unoptimized
                />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {usePageLikeMobile && isMounted
        ? createPortal(
            <div
              className={`fixed inset-0 left-0 bg-black/60 transition-opacity duration-200 md:left-36 ${hideBelowSplit} ${
                isCommentsSheetOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
              }`}
              style={{ zIndex: TANKU_POSTER_COMMENTS_SHEET_Z }}
              onClick={() => setIsCommentsSheetOpen(false)}
              role="presentation"
            >
              <div
                className={`absolute bottom-0 left-0 right-0 grid max-h-[92dvh] min-h-0 w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-t-2xl transition-transform duration-200 ${
                  isPageView
                    ? 'h-[min(72dvh,92dvh)] bg-[#171B21]'
                    : 'h-[min(72dvh,92dvh)] border-t border-white/10 bg-[var(--color-surface-191e23-20)]'
                } ${isCommentsSheetOpen ? 'translate-y-0' : 'translate-y-full'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`flex shrink-0 items-center justify-between px-4 py-3 ${innerRule(`border-b ${postPageDivider}`)}`}
                >
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

                <div className="tanku-modal-scrollbar min-h-0 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
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
                              onUpdate={async () => {
                        await loadComments(0)
                      }}
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

                {token ? (
                  <div
                    className={`shrink-0 border-t p-4 pb-[max(1rem,calc(1rem+env(safe-area-inset-bottom,0px)))] ${postPageBg} ${
                      isPageView ? 'border-white/[0.08]' : 'border-white/10'
                    }`}
                  >
                    <form onSubmit={handleComment} className="flex gap-2">
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
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#73FFA2] text-black transition-colors hover:bg-[#66e891] disabled:cursor-not-allowed disabled:opacity-50"
                        title={isCommenting ? 'Publicando...' : 'Publicar'}
                      >
                        {isCommenting ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        ) : (
                          <PaperAirplaneIcon className="h-5 w-5" />
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(true)}
                    className={`shrink-0 border-t border-white/[0.08] px-4 py-3 pb-[max(0.75rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))] w-full text-center text-sm text-[#73FFA2] hover:underline ${postPageBg}`}
                  >
                    Inicia sesión para comentar
                  </button>
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      {isPageView && isOwner && showOwnerPageActionsModal && isMounted
        ? createPortal(
            <div
              className="fixed inset-0 flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
              style={{ zIndex: embeddedInModal ? TANKU_POSTER_COMMENTS_SHEET_Z : TANKU_POSTER_MODAL_Z }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="owner-post-actions-title"
              onClick={() => !isDeleting && setShowOwnerPageActionsModal(false)}
            >
              <div
                className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#2A3036] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] shadow-2xl sm:rounded-2xl sm:pb-2"
                onClick={(e) => e.stopPropagation()}
              >
                <p
                  id="owner-post-actions-title"
                  className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-gray-400"
                >
                  Tu publicación
                </p>
                <button
                  type="button"
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-medium text-white transition-colors hover:bg-white/10"
                  onClick={() => {
                    setShowOwnerPageActionsModal(false)
                    handleShare()
                  }}
                >
                  <Image
                    src="/icons_tanku/tanku_card_compartir_verde.svg"
                    alt=""
                    width={22}
                    height={22}
                    className="h-5 w-5 shrink-0 object-contain"
                    unoptimized
                  />
                  Compartir
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  onClick={() => {
                    requestDeletePost()
                  }}
                >
                  <TrashIcon className="h-5 w-5 shrink-0" aria-hidden />
                  {isDeleting ? 'Eliminando...' : 'Eliminar publicación'}
                </button>
                <button
                  type="button"
                  className="mt-1 w-full rounded-xl px-4 py-3 text-center text-sm text-gray-400 transition-colors hover:bg-white/5"
                  onClick={() => setShowOwnerPageActionsModal(false)}
                >
                  Cancelar
                </button>
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

      <CategoryLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => setShowLoginModal(false)}
      />

      <TankuConfirmModal
        open={showDeletePostConfirm}
        title="Eliminar publicación"
        message="¿Estás seguro de que quieres eliminar este post? Esta acción no se puede deshacer."
        confirmLabel="Eliminar publicación"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => {
          if (!isDeleting) setShowDeletePostConfirm(false)
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}

