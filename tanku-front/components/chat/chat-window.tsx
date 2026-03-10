'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useChat } from '@/lib/hooks/use-chat'
import { useChatService } from '@/lib/hooks/use-chat-service'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Conversation } from '@/lib/hooks/use-chat'

interface ChatWindowProps {
  conversationId: string | null
  conversation: Conversation | null
}

export function ChatWindow({ conversationId, conversation }: ChatWindowProps) {
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

  const otherParticipant = conversation ? getOtherParticipant(conversation, user?.id || '') : null
  const displayName = otherParticipant?.alias || 
    (otherParticipant?.user 
      ? `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim()
      : otherParticipant?.deletedUserEmail || 'Usuario eliminado') ||
    (otherParticipant?.user?.email || 'Usuario')

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
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

  if (!conversation || !otherParticipant) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Selecciona una conversación para comenzar</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800/50">
        <button
          onClick={() => router.push((otherParticipant.user as any).username ? `/profile/${(otherParticipant.user as any).username}` : `/profile/${otherParticipant.user.id}`)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full"
        >
          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-[#66DEDB] bg-gray-700 flex items-center justify-center">
            {otherParticipant.user.profile?.avatar ? (
              <Image
                src={otherParticipant.user.profile.avatar}
                alt={displayName}
                width={40}
                height={40}
                className="object-cover w-full h-full"
                referrerPolicy="no-referrer"
                unoptimized={otherParticipant.user.profile.avatar.startsWith('http')}
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
              <span className="text-sm text-gray-400 font-bold">
                {(otherParticipant?.user?.firstName?.[0] || 
                  otherParticipant?.user?.email?.[0] || 
                  otherParticipant?.deletedUserEmail?.[0] || 
                  'U').toUpperCase()}
              </span>
            )}
          </div>
          <div>
            {/* En el chat: nombre arriba, username abajo */}
            <h3 className="text-sm font-semibold text-[#73FFA2] hover:text-[#66DEDB] transition-colors">
              {displayName}
            </h3>
            {otherParticipant?.user?.username && (
              <p className="text-xs text-gray-400">{otherParticipant.user.username}</p>
            )}
            {typingUsers.length > 0 && (
              <p className="text-xs text-gray-400">Escribiendo...</p>
            )}
          </div>
        </button>
      </div>

      {/* Mensajes */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
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
                className={`max-w-[70%] rounded-lg p-3 ${
                  isOwn
                    ? 'bg-[#66DEDB] text-black'
                    : 'bg-gray-700 text-white'
                }`}
              >
                {!isOwn && (
                  <p className="text-xs font-semibold mb-1 opacity-70">{senderName}</p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">
                  {renderMessageWithLinks(msg.content)}
                </p>
                <p className="text-xs mt-1 opacity-60">
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
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#66DEDB]"
            rows={1}
            disabled={isSending || !isConnected}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending || !isConnected}
            className="px-4 py-2 bg-[#66DEDB] text-black rounded-lg hover:bg-[#73FFA2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? '...' : 'Enviar'}
          </button>
        </div>
        {!isConnected && (
          <p className="text-xs text-yellow-400 mt-2">
            ⚠️ Reconectando... Los mensajes se enviarán automáticamente al reconectar.
          </p>
        )}
      </div>
    </div>
  )
}

