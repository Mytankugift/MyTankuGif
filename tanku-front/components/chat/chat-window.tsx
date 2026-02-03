'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useChat } from '@/lib/hooks/use-chat'
import { useSocket } from '@/lib/hooks/use-socket'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Conversation } from '@/lib/hooks/use-chat'

interface ChatWindowProps {
  conversationId: string | null
  conversation: Conversation | null
}

export function ChatWindow({ conversationId, conversation }: ChatWindowProps) {
  const router = useRouter()
  const { sendMessage: sendMessageChat, fetchMessages, getMessages, markAsRead, getOtherParticipant, user } = useChat()
  const { socket, isConnected, joinConversation, sendMessage: sendSocketMessage, getMessages: getSocketMessages, getTypingUsers, markAsRead: markAsReadSocket } = useSocket()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastFetchedConversationRef = useRef<string | null>(null)

  const otherParticipant = conversation ? getOtherParticipant(conversation, user?.id || '') : null
  const displayName = otherParticipant?.alias || 
    `${otherParticipant?.user.firstName || ''} ${otherParticipant?.user.lastName || ''}`.trim() ||
    otherParticipant?.user.email || 'Usuario'

  // Obtener mensajes de API (incluye los propios)
  const apiMessages = conversationId ? getMessages(conversationId) : []
  
  // Obtener mensajes de Socket (solo de otros usuarios, no propios)
  const socketMessages = conversationId ? getSocketMessages(conversationId) : []
  
  // Combinar y deduplicar mensajes
  const allMessages = [...apiMessages]
  socketMessages.forEach(socketMsg => {
    // Solo agregar si no existe y no es nuestro mensaje
    if (!allMessages.find(m => m.id === socketMsg.id) && socketMsg.senderId !== user?.id) {
      allMessages.push(socketMsg)
    }
  })
  
  // Ordenar por fecha
  const messages = allMessages.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Cargar mensajes cuando cambia la conversación (solo una vez por conversación)
  useEffect(() => {
    if (conversationId && !conversationId.startsWith('temp-')) {
      // ✅ Solo cargar si no se ha cargado antes para esta conversación
      if (lastFetchedConversationRef.current !== conversationId) {
        lastFetchedConversationRef.current = conversationId
        
        // Unirse a la conversación vía Socket
        if (isConnected) {
          joinConversation(conversationId)
        }
        
        // Cargar mensajes históricos (solo una vez)
        fetchMessages(conversationId).then(() => {
          // Marcar como leído solo cuando el usuario realmente abre este chat específico
          if (markAsReadSocket) {
            // Delay para asegurar que el chat está visible
            setTimeout(() => {
              markAsRead(conversationId, markAsReadSocket)
            }, 500)
          }
        }).catch((err) => {
          console.error('Error cargando mensajes:', err)
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isConnected]) // ✅ Solo estas dependencias para evitar loop infinito

  // Marcar como leído cuando llegan nuevos mensajes y el chat está abierto
  useEffect(() => {
    if (conversationId && messages.length > 0 && markAsReadSocket) {
      // Marcar como leído automáticamente cuando hay nuevos mensajes (por Socket)
      const hasUnread = messages.some(msg => 
        msg.senderId !== user?.id && msg.status !== 'READ'
      )
      if (hasUnread) {
        markAsRead(conversationId, markAsReadSocket)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages.length, user?.id]) // ✅ Solo dependencias esenciales, no las funciones

  // Scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    scrollToBottom()
  }, [conversationId, messages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = () => {
    if (!message.trim() || !conversationId || isSending) return

    // ✅ Verificar que el socket esté conectado ANTES de intentar enviar
    if (!socket || !isConnected || !sendSocketMessage) {
      console.error('❌ Socket no conectado, no se puede enviar mensaje', {
        socket: !!socket,
        isConnected,
        sendSocketMessage: !!sendSocketMessage,
      })
      // Mostrar mensaje al usuario
      alert('El chat no está conectado. Por favor, espera un momento e intenta de nuevo.')
      return
    }

    const messageContent = message.trim()
    setMessage('')
    setIsSending(true)

    try {
      // Enviar SOLO por Socket (no REST)
      sendMessageChat(conversationId, messageContent, 'TEXT', sendSocketMessage)
      
      // Mantener el foco en el textarea después de enviar
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      // Restaurar mensaje si falla
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
              />
            ) : (
              <span className="text-sm text-gray-400 font-bold">
                {(otherParticipant.user.firstName?.[0] || otherParticipant.user.email?.[0] || 'U').toUpperCase()}
              </span>
            )}
          </div>
          <div>
            {/* En el chat: nombre arriba, username abajo */}
            <h3 className="text-sm font-semibold text-[#73FFA2] hover:text-[#66DEDB] transition-colors">
              {displayName}
            </h3>
            {(otherParticipant.user as any).username && (
              <p className="text-xs text-gray-400">{(otherParticipant.user as any).username}</p>
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
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.id
          const senderName = msg.senderAlias || 
            `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() ||
            msg.sender.email

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
            disabled={isSending}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="px-4 py-2 bg-[#66DEDB] text-black rounded-lg hover:bg-[#73FFA2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

