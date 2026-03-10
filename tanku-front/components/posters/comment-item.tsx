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
  hiddenByOwner?: boolean
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
  isPostOwner?: boolean // Si el usuario actual es el dueño del post
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
  rootComment = null, // Comentario principal (nivel 0)
  isPostOwner = false // Si el usuario actual es el dueño del post
}: CommentItemProps) {
  const router = useRouter()
  const { token, user } = useAuthStore()
  const [isLiking, setIsLiking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHiding, setIsHiding] = useState(false)
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

  // Procesar menciones en el contenido
  // El backend ya formatea el contenido reemplazando @{userId} con @username
  // Aquí solo necesitamos convertir las menciones en links clickeables
  const processMentions = (text: string) => {
    if (!text) return [<span key="empty" className="inline"></span>]
    
    // El backend ya formateó el contenido, así que buscamos @username
    // Necesitamos encontrar las menciones y buscar el userId correspondiente
    // usando el array de mentions del comentario y el mapa de mentionedUsers
    
    // Dividir el texto en partes: menciones y texto normal
    // Regex simplificado: captura @ seguido de username (sin espacios, puede tener _ y -)
    // o @ seguido de nombre completo (con espacios) hasta espacio, salto de línea o fin
    const mentionRegex = /@([a-zA-Z0-9_-]+)|@([a-zA-ZáéíóúÁÉÍÓÚñÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{0,30}[a-zA-ZáéíóúÁÉÍÓÚñÑ])(?=\s|$|@|,|\.|!|\?|:)/g
    
    const parts: Array<{ type: 'mention' | 'text', content: string, index: number }> = []
    let lastIndex = 0
    let match
    
    // Resetear lastIndex del regex
    mentionRegex.lastIndex = 0
    
    while ((match = mentionRegex.exec(text)) !== null) {
      // Agregar texto antes de la mención
      if (match.index > lastIndex) {
        const textBefore = text.substring(lastIndex, match.index)
        if (textBefore) {
          parts.push({
            type: 'text',
            content: textBefore,
            index: lastIndex
          })
        }
      }
      
      // Agregar la mención (usar match[1] si es username, match[2] si es nombre completo)
      const mentionText = match[0] // @username o @nombre completo
      parts.push({
        type: 'mention',
        content: mentionText,
        index: match.index
      })
      
      lastIndex = match.index + mentionText.length
    }
    
    // Agregar texto restante
    if (lastIndex < text.length) {
      const textAfter = text.substring(lastIndex)
      if (textAfter) {
        parts.push({
          type: 'text',
          content: textAfter,
          index: lastIndex
        })
      }
    }
    
    // Si no hay partes, devolver el texto completo como texto normal
    if (parts.length === 0) {
      return [<span key="full-text" className="inline">{text}</span>]
    }
    
    return parts.map((part, index) => {
      if (part.type === 'mention') {
        const mentionName = part.content.substring(1).trim() // Nombre sin el @
        
        // Buscar el usuario mencionado en el array de mentions del comentario
        let foundUserId: string | null = null
        let foundUsername: string | null = null
        
        // Buscar en mentionedUsers (si está disponible)
        if (comment.mentions && comment.mentions.length > 0) {
          for (const userId of comment.mentions) {
            const mentionedUser = mentionedUsers[userId]
            if (mentionedUser) {
              // Priorizar búsqueda por username (formato actual de menciones)
              if (mentionedUser.username && mentionedUser.username.toLowerCase() === mentionName.toLowerCase()) {
                foundUserId = userId
                foundUsername = mentionedUser.username || null
                break
              }
              // Fallback: buscar por nombre completo (compatibilidad)
              const userDisplayName = mentionedUser.firstName && mentionedUser.lastName
                ? `${mentionedUser.firstName} ${mentionedUser.lastName}`
                : ''
              if (userDisplayName.toLowerCase() === mentionName.toLowerCase()) {
                foundUserId = userId
                foundUsername = mentionedUser.username || null
                break
              }
            }
          }
        }
        
        // Si no se encontró, buscar en los comentarios
        if (!foundUserId) {
          const foundInComments = allComments.find(c => {
            // Priorizar búsqueda por username
            if (c.author.username && c.author.username.toLowerCase() === mentionName.toLowerCase()) return true
            // Fallback: buscar por nombre completo
            const authorDisplayName = c.author.firstName && c.author.lastName
              ? `${c.author.firstName} ${c.author.lastName}`
              : ''
            return authorDisplayName.toLowerCase() === mentionName.toLowerCase()
          })
          
          if (foundInComments?.author) {
            foundUserId = foundInComments.author.id
            foundUsername = foundInComments.author.username || null
          }
        }
        
        // Si encontramos el usuario, crear link; si no, mostrar como mención no clickeable
        if (foundUserId) {
          return (
            <button
              key={`mention-${part.index}-${index}`}
              onClick={() => router.push(foundUsername ? `/profile/${foundUsername}` : `/profile/${foundUserId}`)}
              className="text-[#73FFA2] font-semibold hover:text-[#66DEDB] hover:underline transition-colors inline"
            >
              {part.content}
            </button>
          )
        } else {
          // Mostrar como mención aunque no se encuentre el usuario (para mantener el formato)
          return (
            <span
              key={`mention-${part.index}-${index}`}
              className="text-[#73FFA2] font-semibold inline"
            >
              {part.content}
            </span>
          )
        }
      }
      
      // Texto normal
      return <span key={`text-${part.index}-${index}`} className="inline">{part.content}</span>
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
  // NO permitir responder a comentarios ocultos
  const canReply = (level === 0 || level === 1) && token && !comment.hiddenByOwner
  
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

  const handleDeleteComment = async () => {
    if (!posterId || !token) return
    
    if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await apiClient.patch(
        API_ENDPOINTS.POSTERS.COMMENT_UPDATE(posterId, comment.id),
        { isActive: false }
      )

      if (response.success) {
        // Notificar al componente padre para actualizar
        if (onUpdate) {
          onUpdate()
        }
      } else {
        console.error('Error al eliminar comentario:', response.error)
      }
    } catch (err) {
      console.error('Error al eliminar comentario:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleHideComment = async () => {
    if (!posterId || !token || !isPostOwner) return
    
    const action = comment.hiddenByOwner ? 'mostrar' : 'ocultar'
    if (!confirm(`¿Estás seguro de que quieres ${action} este comentario? ${comment.hiddenByOwner ? 'El comentario y sus respuestas volverán a ser visibles.' : 'El comentario y sus respuestas serán ocultados.'}`)) {
      return
    }

    setIsHiding(true)
    try {
      const response = await apiClient.patch(
        API_ENDPOINTS.POSTERS.COMMENT_UPDATE(posterId, comment.id),
        { hiddenByOwner: !comment.hiddenByOwner }
      )

      if (response.success) {
        // Notificar al componente padre para actualizar
        if (onUpdate) {
          onUpdate()
        }
      } else {
        console.error('Error al ocultar/mostrar comentario:', response.error)
        alert('Error al ocultar/mostrar comentario')
      }
    } catch (err) {
      console.error('Error al ocultar/mostrar comentario:', err)
      alert('Error al ocultar/mostrar comentario')
    } finally {
      setIsHiding(false)
    }
  }

  return (
    <div className={`flex gap-3 ${level > 0 ? 'ml-8' : ''} ${comment.hiddenByOwner ? 'opacity-60' : ''}`}>
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
          <div className="mb-1 flex items-center gap-2">
            <button
              onClick={() => router.push(`/profile/${comment.author.username || comment.author.id}`)}
              className="text-white font-semibold text-sm hover:text-[#73FFA2] transition-colors text-left"
            >
              {displayAuthorName}
            </button>
            {/* Indicador de comentario oculto - al lado del nombre, solo visible para el dueño del post */}
            {comment.hiddenByOwner && isPostOwner && (
              <span className="text-yellow-400 text-xs" title="Comentario oculto (solo visible para ti)">
                🔒
              </span>
            )}
          </div>

          {/* Mensaje - debajo del nombre */}
          <div className="mb-1">
            <div className="text-white text-sm break-words whitespace-pre-wrap">
              <span className="break-words inline-flex flex-wrap items-baseline gap-x-1">
                {processMentions(displayText)}
                {needsExpand && !isExpanded && (
                  <>
                    {' '}
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="text-[#73FFA2] hover:text-[#66e891] ml-1 inline"
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
                      className="text-[#73FFA2] hover:text-[#66e891] ml-1 inline"
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
                      className="text-[#73FFA2] hover:text-[#66e891] ml-1 inline"
                    >
                      ver menos
                    </button>
                  </>
                )}
              </span>
            </div>
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

              {/* Ocultar - solo si es el dueño del post */}
              {token && isPostOwner && (
                <button
                  onClick={handleHideComment}
                  disabled={isHiding}
                  className="text-gray-500 hover:text-yellow-500 text-xs transition-colors disabled:opacity-50"
                  title={comment.hiddenByOwner ? 'Mostrar comentario' : 'Ocultar comentario'}
                >
                  {isHiding ? 'Procesando...' : (comment.hiddenByOwner ? 'Mostrar' : 'Ocultar')}
                </button>
              )}

              {/* Eliminar - solo si es el dueño del comentario */}
              {token && user && comment.userId === user.id && (
                <button
                  onClick={handleDeleteComment}
                  disabled={isDeleting}
                  className="text-gray-500 hover:text-red-500 text-xs transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
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
                        isPostOwner={isPostOwner}
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
