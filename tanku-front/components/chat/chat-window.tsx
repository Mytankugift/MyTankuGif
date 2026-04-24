'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useChat } from '@/lib/hooks/use-chat'
import { useChatService } from '@/lib/hooks/use-chat-service'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Conversation } from '@/lib/hooks/use-chat'

interface ChatWindowProps {
  conversationId: string | null
  conversation: Conversation | null
  /** Móvil: cabecera tipo modal con «atrás» que cierra el chat en la pila de la página */
  onMobileBack?: () => void
  /** Móvil overlay pantalla completa: cabecera más compacta y botón atrás táctil grande */
  mobileFullBleedChrome?: boolean
}

export function ChatWindow({
  conversationId,
  conversation,
  onMobileBack,
  mobileFullBleedChrome = false,
}: ChatWindowProps) {
  const router = useRouter()
  const { getOtherParticipant, user } = useChat()
  const { isConnected, sendMessage, getMessages, getTypingUsers, markAsRead, loadMessages, joinConversation, lastMessage } = useChatService()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastFetchedConversationRef = useRef<string | null>(null)
  const scrollPositionRef = useRef<number>(0)

  const rowDividerStyle = {
    borderImage:
      'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
  } as const

  const otherParticipant = conversation ? getOtherParticipant(conversation, user?.id || '') : null
  const displayName =
    otherParticipant?.user?.username ||
    otherParticipant?.alias ||
    (otherParticipant?.user
      ? `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim()
      : otherParticipant?.deletedUserEmail || 'Usuario eliminado') ||
    otherParticipant?.user?.email ||
    'Usuario'

  // ✅ NUEVO: Obtener mensajes directamente del servicio (ya están sincronizados)
  const messages = conversationId ? getMessages(conversationId) : []
  
  // Ordenar por fecha
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // ✅ NUEVO: Unirse a conversación y cargar mensajes históricos (solo primera página)
  useEffect(() => {
    if (conversationId && !conversationId.startsWith('temp-')) {
      if (lastFetchedConversationRef.current !== conversationId) {
        lastFetchedConversationRef.current = conversationId
        setCurrentPage(1)
        setHasMoreMessages(true)
        
        // Unirse a la conversación (automático al reconectar)
        if (isConnected) {
          joinConversation(conversationId)
        }
        
        // Cargar primera página de mensajes históricos
        setIsLoadingMore(true)
        loadMessages(conversationId, 1, 30).then((loadedMessages) => {
          // Si cargó menos de 30, no hay más mensajes
          if (loadedMessages.length < 30) {
            setHasMoreMessages(false)
          }
          setIsLoadingMore(false)
          
          // Marcar como leído después de cargar
          setTimeout(() => {
            markAsRead(conversationId)
          }, 500)
        }).catch((err) => {
          console.error('Error cargando mensajes:', err)
          setIsLoadingMore(false)
        })
      }
    }
  }, [conversationId, isConnected, joinConversation, loadMessages, markAsRead])

  // ✅ NUEVO: Re-unión automática si se desconecta y reconecta
  useEffect(() => {
    if (conversationId && isConnected && !conversationId.startsWith('temp-')) {
      joinConversation(conversationId)
    }
  }, [conversationId, isConnected, joinConversation])

  // ✅ NUEVO: Marcar como leído solo cuando el chat está visible y el usuario está viendo
  // No marcar automáticamente cuando llegan mensajes, solo cuando el usuario está viendo activamente
  useEffect(() => {
    if (!conversationId || sortedMessages.length === 0) return
    
    // Solo marcar como leído si:
    // 1. El chat está visible (no minimizado, no en otra página)
    // 2. Hay mensajes no leídos de otros usuarios
    // 3. El usuario está viendo el chat (scroll cerca del final)
    const hasUnread = sortedMessages.some(msg => 
      msg.senderId !== user?.id && msg.status !== 'READ'
    )
    
    if (hasUnread && messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight
      
      // Solo marcar como leído si está cerca del final (viendo los mensajes más recientes)
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
      
      if (isNearBottom) {
        // Delay para evitar marcar como leído demasiado rápido
        const timeoutId = setTimeout(() => {
          markAsRead(conversationId)
        }, 1000) // Esperar 1 segundo antes de marcar como leído
        
        return () => clearTimeout(timeoutId)
      }
    }
  }, [conversationId, sortedMessages.length, user?.id, markAsRead, lastMessage])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  // Scroll al final cuando hay nuevos mensajes (solo si no está cargando más)
  useEffect(() => {
    if (!isLoadingMore) {
      scrollToBottom()
    }
  }, [conversationId, sortedMessages.length, isLoadingMore])

  // ✅ NUEVO: Manejar scroll para cargar más mensajes
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || isLoadingMore || !hasMoreMessages) return

    const container = messagesContainerRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    // Si está cerca del top (100px), cargar más mensajes
    if (scrollTop < 100 && conversationId) {
      setIsLoadingMore(true)
      const nextPage = currentPage + 1
      
      // Guardar posición de scroll antes de cargar
      scrollPositionRef.current = scrollHeight - scrollTop
      
      loadMessages(conversationId, nextPage, 30).then((loadedMessages) => {
        if (loadedMessages.length < 30) {
          setHasMoreMessages(false)
        }
        setCurrentPage(nextPage)
        setIsLoadingMore(false)
        
        // Restaurar posición de scroll después de cargar
        setTimeout(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight
            messagesContainerRef.current.scrollTop = newScrollHeight - scrollPositionRef.current
          }
        }, 0)
      }).catch((err) => {
        console.error('Error cargando más mensajes:', err)
        setIsLoadingMore(false)
      })
    }
  }, [conversationId, currentPage, isLoadingMore, hasMoreMessages, loadMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ✅ NUEVO: Enviar mensaje usando el servicio (con queue automático)
  const handleSend = () => {
    if (!message.trim() || !conversationId || isSending) return

    const messageContent = message.trim()
    setMessage('')
    setIsSending(true)

    try {
      // ✅ El servicio maneja automáticamente:
      // - Queue si está desconectado
      // - Optimistic updates
      // - ACK handling
      sendMessage(conversationId, messageContent, 'TEXT')
      
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      setMessage(messageContent)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    if (e.nativeEvent.isComposing) return
    e.preventDefault()
    handleSend()
  }
  
  const typingUsers = conversationId ? getTypingUsers(conversationId) : []

  // Función para convertir URLs y menciones en links clicables
  const renderMessageWithLinks = (text: string) => {
    if (!text) return text
    
    // Regex para detectar URLs y menciones
    const urlRegex = /(https?:\/\/[^\s]+)/g
    // Regex para menciones: @displayName|userId o @userId
    const mentionRegex = /(@[^|@]+?\|[a-zA-Z0-9_-]{20,})|(@[a-zA-Z0-9_-]{20,})/g
    
    // Primero dividir por URLs
    const urlParts = text.split(urlRegex)
    
    return urlParts.map((urlPart, urlIndex) => {
      // Si es una URL, renderizarla
      if (urlPart.match(urlRegex)) {
        return (
          <a
            key={`url-${urlIndex}`}
            href={urlPart}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline break-all"
          >
            {urlPart}
          </a>
        )
      }
      
      // Si no es URL, procesar menciones
      const mentionParts = urlPart.split(mentionRegex)
      return mentionParts.map((mentionPart, mentionIndex) => {
        // Formato: @displayName|userId
        if (mentionPart.startsWith('@') && mentionPart.includes('|')) {
          const match = mentionPart.match(/^@(.+?)\|([a-zA-Z0-9_-]{20,})$/)
          if (match) {
            const [, displayName, userId] = match
            return (
              <button
                key={`mention-${urlIndex}-${mentionIndex}`}
                onClick={() => {
                  // Intentar obtener username del usuario mencionado
                  // Por ahora usamos userId como fallback
                  router.push(`/profile/${userId}`)
                }}
                className="text-[#73FFA2] font-semibold hover:text-[#66DEDB] hover:underline transition-colors"
              >
                @{displayName.trim()}
              </button>
            )
          }
        }
        // Formato legacy: @userId
        if (mentionPart.startsWith('@') && mentionPart.length > 20) {
          const userId = mentionPart.substring(1).trim()
          return (
            <button
              key={`mention-${urlIndex}-${mentionIndex}`}
              onClick={() => router.push(`/profile/${userId}`)}
              className="text-[#73FFA2] font-semibold hover:text-[#66DEDB] hover:underline transition-colors"
            >
              @{userId.substring(0, 8)}...
            </button>
          )
        }
        return <span key={`text-${urlIndex}-${mentionIndex}`}>{mentionPart}</span>
      })
    })
  }

  if (!conversation || !otherParticipant || !otherParticipant.user) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Selecciona una conversación para comenzar</p>
      </div>
    )
  }

  const otherUser = otherParticipant.user

  const profileHref = otherUser.username
    ? `/profile/${otherUser.username}`
    : `/profile/${otherUser.id}`

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Móvil: mismo patrón que el dropdown de mensajes (atrás + avatar + nombre) */}
      {onMobileBack ? (
        <div
          className={clsx(
            'shrink-0 border-b md:hidden',
            mobileFullBleedChrome ? 'px-2 py-2' : 'p-4'
          )}
          style={rowDividerStyle}
        >
          <div className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={onMobileBack}
              className={clsx(
                'flex shrink-0 items-center justify-center rounded-full text-[#D7D7D7] transition-colors hover:bg-white/10 hover:text-white active:bg-white/15',
                mobileFullBleedChrome ? 'h-11 w-11' : 'h-10 w-10 p-1.5'
              )}
              title="Volver a conversaciones"
              aria-label="Volver a conversaciones"
            >
              <svg
                className="h-6 w-6 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => router.push(profileHref)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left transition-opacity hover:opacity-85"
            >
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#66DEDB] bg-gray-700">
                {otherUser.profile?.avatar ? (
                  <Image
                    src={otherUser.profile.avatar}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    unoptimized={otherUser.profile.avatar.startsWith('http')}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                    onLoad={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'block'
                    }}
                  />
                ) : (
                  <span className="text-xs font-semibold text-gray-400">
                    {(
                      otherUser.firstName?.[0] ||
                      otherUser.email?.[0] ||
                      otherParticipant?.deletedUserEmail?.[0] ||
                      'U'
                    ).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                {typingUsers.length > 0 ? (
                  <p className="text-xs text-gray-400">Escribiendo...</p>
                ) : null}
              </div>
            </button>
          </div>
        </div>
      ) : null}

      {/* Escritorio: cabecera alineada a la derecha */}
      <div
        className={`shrink-0 border-b p-4 ${onMobileBack ? 'hidden md:block' : ''}`}
        style={rowDividerStyle}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push(profileHref)}
            className="flex max-w-full flex-row-reverse items-center gap-3 rounded-lg py-0.5 text-right transition-opacity hover:opacity-85"
          >
            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#66DEDB] bg-gray-700">
              {otherUser.profile?.avatar ? (
                <Image
                  src={otherUser.profile.avatar}
                  alt={displayName}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  unoptimized={otherUser.profile.avatar.startsWith('http')}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                  onLoad={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'block'
                  }}
                />
              ) : (
                <span className="text-xs font-semibold text-gray-400">
                  {(
                    otherUser.firstName?.[0] ||
                    otherUser.email?.[0] ||
                    otherParticipant?.deletedUserEmail?.[0] ||
                    'U'
                  ).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              {otherUser.username &&
                displayName.toLowerCase() !== otherUser.username.toLowerCase() && (
                  <p className="truncate text-xs text-gray-400">@{otherUser.username}</p>
                )}
              {typingUsers.length > 0 && (
                <p className="text-xs text-gray-400">Escribiendo...</p>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#66DEDB]"></div>
          </div>
        )}
        {sortedMessages.map((msg) => {
          const isOwn = msg.senderId === user?.id
          const senderName = msg.senderAlias || 
            (msg.sender 
              ? `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim()
              : msg.deletedSenderEmail || 'Usuario eliminado') ||
            (msg.sender?.email || 'Usuario desconocido')

          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 ${
                  isOwn ? 'bg-[#66DEDB] text-gray-900' : 'bg-gray-700 text-white'
                }`}
              >
                {!isOwn && (
                  <p className="mb-1 text-xs font-semibold opacity-70">{senderName}</p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm">
                  {renderMessageWithLinks(msg.content)}
                </p>
                <p
                  className={`mt-1 text-xs ${isOwn ? 'text-gray-700' : 'text-gray-400'}`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t bg-transparent p-3" style={rowDividerStyle}>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="max-h-[120px] flex-1 resize-none rounded-lg bg-gray-700 px-3 py-2 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#66DEDB]"
            rows={1}
            disabled={isSending || !isConnected}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || isSending || !isConnected}
            className="rounded-lg bg-[#66DEDB] p-2 text-gray-900 transition-colors hover:bg-[#5accc9] disabled:cursor-not-allowed disabled:opacity-50"
            title="Enviar"
          >
            {isSending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
        {!isConnected && (
          <p className="mt-2 px-3 text-xs text-yellow-400">
            Reconectando... Los mensajes se enviarán automáticamente al reconectar.
          </p>
        )}
      </div>
    </div>
  )
}


