'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/components/shared/user-avatar'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

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
  replies?: Comment[]
  isLiked?: boolean
}

interface CommentItemProps {
  comment: Comment
  posterId?: string
  mentionedUsers?: Record<string, any>
  allComments?: Comment[]
  onReplyClick?: (commentId: string, authorName: string, authorId: string) => void
  onUpdate?: () => void
  level?: number
  parentComment?: Comment | null
  rootComment?: Comment | null // Comentario principal (nivel 0) para respuestas anidadas
}

const MAX_VISIBLE_LENGTH = 150
const MAX_EXPANDED_LENGTH = 500

export function CommentItem({ 
  comment,
  posterId,
  mentionedUsers = {}, 
  allComments = [],
  onReplyClick,
  onUpdate,
  level = 0,
  parentComment = null,
  rootComment = null // Comentario principal (nivel 0)
}: CommentItemProps) {
  const router = useRouter()
  const { token, user } = useAuthStore()
  const [isLiking, setIsLiking] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDoubleExpanded, setIsDoubleExpanded] = useState(false)
  const [showReplies, setShowReplies] = useState(false) // Colapsar respuestas por defecto

  // Construir nombre del autor
  const commentAuthorName = comment.author?.firstName && comment.author?.lastName
    ? `${comment.author.firstName} ${comment.author.lastName}`
    : comment.author?.username || comment.author?.email?.split('@')[0] || 'Usuario'

  // Si es una respuesta (level === 1), mostrar "Perfil A > Perfil B"
  const displayAuthorName = level === 1 && parentComment
    ? (() => {
        const parentAuthorName = parentComment.author?.firstName && parentComment.author?.lastName
          ? `${parentComment.author.firstName} ${parentComment.author.lastName}`
          : parentComment.author?.username || parentComment.author?.email?.split('@')[0] || 'Usuario'
        return `${parentAuthorName} > ${commentAuthorName}`
      })()
    : commentAuthorName

  // Procesar menciones en el contenido - mejorado para manejar espacios y texto después
  const processMentions = (text: string) => {
    if (!text) return ''
    
    // Regex mejorado: captura @displayName|userId correctamente incluso con espacios en el nombre
    // Busca: @ seguido de cualquier cosa (incluyendo espacios) hasta |, luego userId (mínimo 20 caracteres)
    // Luego puede haber espacio y más texto
    const parts = text.split(/(@[^|@]+?\|[a-zA-Z0-9_-]{20,})/g)
    return parts.map((part, index) => {
      if (part.startsWith('@') && part.includes('|')) {
        // Formato: @displayName|userId
        const match = part.match(/^@(.+?)\|([a-zA-Z0-9_-]{20,})$/)
        if (match) {
          const [, displayName, userId] = match
          // Buscar el usuario mencionado para obtener su nombre real
          const mentionedUser = mentionedUsers[userId]
          let finalDisplayName = displayName.trim()
          
          // Si tenemos el usuario en el estado, usar su información real
          if (mentionedUser) {
            finalDisplayName = mentionedUser.username 
              || (mentionedUser.firstName && mentionedUser.lastName
                  ? `${mentionedUser.firstName} ${mentionedUser.lastName}`
                  : mentionedUser.email?.split('@')[0] || displayName.trim())
          } else {
            // Buscar en comentarios
            const foundInComments = allComments.find(c => c.author.id === userId)
            if (foundInComments?.author) {
              const author = foundInComments.author
              finalDisplayName = author.username 
                || (author.firstName && author.lastName
                    ? `${author.firstName} ${author.lastName}`
                    : author.email?.split('@')[0] || displayName.trim())
            }
          }
          
          // Obtener username del usuario mencionado si está disponible
          const username = mentionedUser?.username || (allComments?.find(c => c.author.id === userId)?.author?.username)
          
          return (
            <button
              key={index}
              onClick={() => router.push(username ? `/profile/${username}` : `/profile/${userId}`)}
              className="text-[#73FFA2] font-semibold hover:text-[#66DEDB] hover:underline transition-colors"
            >
              @{finalDisplayName}
            </button>
          )
        }
      }
      // Formato legacy: @userId (sin |)
      if (part.startsWith('@') && !part.includes('|')) {
        const userId = part.substring(1).trim()
        if (userId.length >= 20) {
          const mentionedUser = mentionedUsers[userId]
          let displayName = userId.substring(0, 8)
          
          if (mentionedUser) {
            displayName = mentionedUser.username 
              || (mentionedUser.firstName && mentionedUser.lastName
                  ? `${mentionedUser.firstName} ${mentionedUser.lastName}`
                  : mentionedUser.email?.split('@')[0] || displayName)
          } else {
            const foundInComments = allComments.find(c => c.author.id === userId)
            if (foundInComments?.author) {
              const author = foundInComments.author
              displayName = author.username 
                || (author.firstName && author.lastName
                    ? `${author.firstName} ${author.lastName}`
                    : author.email?.split('@')[0] || displayName)
            }
          }
          
          // Obtener username del usuario mencionado si está disponible
          const username = mentionedUser?.username || (allComments?.find(c => c.author.id === userId)?.author?.username)
          
          return (
            <button
              key={index}
              onClick={() => router.push(username ? `/profile/${username}` : `/profile/${userId}`)}
              className="text-[#73FFA2] font-semibold hover:text-[#66DEDB] hover:underline transition-colors"
            >
              @{displayName}
            </button>
          )
        }
      }
      return <span key={index}>{part}</span>
    })
  }

  // Determinar texto a mostrar con expansión doble
  const needsExpand = comment.content.length > MAX_VISIBLE_LENGTH
  const needsDoubleExpand = comment.content.length > MAX_EXPANDED_LENGTH
  
  let displayText = comment.content
  if (!isExpanded) {
    displayText = needsExpand ? comment.content.substring(0, MAX_VISIBLE_LENGTH) : comment.content
  } else if (isExpanded && needsDoubleExpand && !isDoubleExpanded) {
    displayText = comment.content.substring(0, MAX_EXPANDED_LENGTH)
  }

  const handleLike = async () => {
    if (!token || isLiking || !posterId) return
    
    setIsLiking(true)
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.POSTERS.COMMENT_LIKE(posterId, comment.id),
        {}
      )

      if (response.success && response.data) {
        if (onUpdate) {
          onUpdate()
        }
      }
    } catch (err) {
      console.error('Error al dar like:', err)
    } finally {
      setIsLiking(false)
    }
  }

  // Obtener respuestas de este comentario
  const replies = comment.replies || allComments.filter(c => c.parentId === comment.id)
  
  // Permitir responder en nivel 0 y nivel 1
  // Cuando se responde a una respuesta (nivel 1), debe insertarse en el comentario principal
  const canReply = (level === 0 || level === 1) && token
  
  // Determinar el ID del comentario al que se responderá
  // Si es nivel 1, responder al comentario principal (rootComment), no a la respuesta
  const getReplyTargetId = () => {
    if (level === 1 && rootComment) {
      return rootComment.id // Responder al comentario principal
    }
    return comment.id // Responder directamente a este comentario
  }

  const handleReplyClick = () => {
    if (onReplyClick) {
      const targetId = getReplyTargetId()
      onReplyClick(targetId, commentAuthorName, comment.author.id)
    }
  }

  return (
    <div className={`flex gap-3 ${level > 0 ? 'ml-8' : ''}`}>
      {/* Avatar - siempre circular, no se alarga */}
      <UserAvatar 
        user={comment.author} 
        size={32}
        className="flex-shrink-0"
      />

      {/* Contenido del comentario */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex flex-col">
          {/* Nombre del usuario - arriba - clickeable */}
          <div className="mb-1">
            <button
              onClick={() => router.push(`/profile/${comment.author.id}`)}
              className="text-white font-semibold text-sm hover:text-[#73FFA2] transition-colors text-left"
            >
              {displayAuthorName}
            </button>
          </div>

          {/* Mensaje - debajo del nombre */}
          <div className="mb-1">
            <p className="text-white text-sm break-words whitespace-pre-wrap">
              <span className="break-words">
                {processMentions(displayText)}
                {needsExpand && !isExpanded && (
                  <>
                    {' '}
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="text-[#73FFA2] hover:text-[#66e891] ml-1"
                    >
                      ver más
                    </button>
                  </>
                )}
                {isExpanded && needsDoubleExpand && !isDoubleExpanded && (
                  <>
                    {' '}
                    <button
                      onClick={() => setIsDoubleExpanded(true)}
                      className="text-[#73FFA2] hover:text-[#66e891] ml-1"
                    >
                      ver más
                    </button>
                  </>
                )}
                {isExpanded && (needsDoubleExpand ? isDoubleExpanded : true) && (
                  <>
                    {' '}
                    <button
                      onClick={() => {
                        setIsExpanded(false)
                        setIsDoubleExpanded(false)
                      }}
                      className="text-[#73FFA2] hover:text-[#66e891] ml-1"
                    >
                      ver menos
                    </button>
                  </>
                )}
              </span>
            </p>
          </div>

          {/* Fecha, Responder y Me gusta - en la misma línea */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-4">
              {/* Fecha */}
              <p className="text-gray-500 text-xs">
                {new Date(comment.createdAt).toLocaleDateString('es-ES', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              
              {/* Responder - permitido en nivel 0 y nivel 1 */}
              {canReply && (
                <button
                  onClick={handleReplyClick}
                  className="text-gray-500 hover:text-white text-xs"
                >
                  Responder
                </button>
              )}
            </div>

            {/* Me gusta - extremo derecho */}
            {token && (
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
                  comment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
              >
                {comment.isLiked ? (
                  <HeartSolidIcon className="w-4 h-4" />
                ) : (
                  <HeartIcon className="w-4 h-4" />
                )}
                {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
              </button>
            )}
          </div>

          {/* Mostrar respuestas - colapsadas por defecto */}
          {replies.length > 0 && (
            <div className="mt-2">
              {!showReplies ? (
                <button
                  onClick={() => setShowReplies(true)}
                  className="text-[#73FFA2] hover:text-[#66e891] text-xs font-medium"
                >
                  Ver {replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowReplies(false)}
                    className="text-[#73FFA2] hover:text-[#66e891] text-xs font-medium mb-2"
                  >
                    Ocultar respuestas
                  </button>
                  <div className="space-y-2">
                    {replies.map((reply) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        posterId={posterId}
                        mentionedUsers={mentionedUsers}
                        allComments={allComments}
                        onReplyClick={onReplyClick}
                        onUpdate={onUpdate}
                        level={level + 1}
                        parentComment={comment}
                        rootComment={level === 0 ? comment : rootComment} // Pasar el comentario principal
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
