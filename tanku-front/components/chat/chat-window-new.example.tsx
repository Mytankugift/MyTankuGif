'use client'

/**
 * EJEMPLO: ChatWindow usando el nuevo ChatService
 * 
 * Este es un ejemplo de cómo migrar componentes al nuevo servicio.
 * Reemplaza el uso de useSocket + useChat con useChatService
 */

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useChatService } from '@/lib/hooks/use-chat-service'
import { useChat } from '@/lib/hooks/use-chat' // Solo para getOtherParticipant y fetchConversations
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Conversation } from '@/lib/hooks/use-chat'

interface ChatWindowProps {
  conversationId: string | null
  conversation: Conversation | null
}

export function ChatWindowNew({ conversationId, conversation }: ChatWindowProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  
  // ✅ NUEVO: Usar el servicio unificado
  const {
    isConnected,
    sendMessage,
    getMessages,
    getTypingUsers,
    markAsRead,
    loadMessages,
    joinConversation,
    lastMessage,
  } = useChatService()
  
  // Mantener useChat solo para getOtherParticipant y fetchConversations
  const { getOtherParticipant, fetchConversations } = useChat()
  
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastFetchedConversationRef = useRef<string | null>(null)

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

  // ✅ NUEVO: Unirse a conversación y cargar mensajes históricos
  useEffect(() => {
    if (conversationId && !conversationId.startsWith('temp-')) {
      if (lastFetchedConversationRef.current !== conversationId) {
        lastFetchedConversationRef.current = conversationId
        
        // Unirse a la conversación (automático al reconectar)
        if (isConnected) {
          joinConversation(conversationId)
        }
        
        // Cargar mensajes históricos (solo primera vez)
        loadMessages(conversationId, 1, 50).then(() => {
          // Marcar como leído después de cargar
          setTimeout(() => {
            markAsRead(conversationId)
          }, 500)
        }).catch((err) => {
          console.error('Error cargando mensajes:', err)
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

  // Marcar como leído cuando llegan nuevos mensajes
  useEffect(() => {
    if (conversationId && sortedMessages.length > 0) {
      const hasUnread = sortedMessages.some(msg => 
        msg.senderId !== user?.id && msg.status !== 'READ'
      )
      if (hasUnread) {
        markAsRead(conversationId)
      }
    }
  }, [conversationId, sortedMessages.length, user?.id, markAsRead, lastMessage])

  // Scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    scrollToBottom()
  }, [conversationId, sortedMessages.length])

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
  
  // ✅ NUEVO: Obtener usuarios escribiendo del servicio
  const typingUsers = conversationId ? getTypingUsers(conversationId) : []

  // ... resto del componente igual ...
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700 bg-gray-800/50">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Avatar y nombre */}
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#66DEDB] bg-gray-700 flex items-center justify-center">
            {otherParticipant?.user?.profile?.avatar ? (
              <Image
                src={otherParticipant.user.profile.avatar}
                alt={displayName}
                width={40}
                height={40}
                className="object-cover w-full h-full"
                referrerPolicy="no-referrer"
                unoptimized={otherParticipant.user.profile.avatar.startsWith('http')}
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
        </div>
      </div>

      {/* Mensajes */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
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
                  {msg.content}
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
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#66DEDB]"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
            disabled={isSending || !isConnected}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending || !isConnected}
            className="px-4 py-2 bg-[#66DEDB] text-black rounded-lg font-semibold hover:bg-[#73FFA2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Enviando...' : 'Enviar'}
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



