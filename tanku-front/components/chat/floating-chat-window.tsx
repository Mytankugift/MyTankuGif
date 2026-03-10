'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useChat } from '@/lib/hooks/use-chat'
import { useChatService } from '@/lib/hooks/use-chat-service'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Conversation } from '@/lib/hooks/use-chat'

interface FloatingChatWindowProps {
  conversationId: string
  conversation: Conversation | null
  onClose: () => void
  position?: { x: number; y: number }
}

export function FloatingChatWindow({ conversationId, conversation, onClose, position }: FloatingChatWindowProps) {
  const { getOtherParticipant, user } = useChat()
  const { isConnected, sendMessage, getMessages, markAsRead, loadMessages, joinConversation, lastMessage } = useChatService()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const lastFetchedConversationRef = useRef<string | null>(null)

  const otherParticipant = conversation ? getOtherParticipant(conversation, user?.id || '') : null
  const displayName = otherParticipant?.alias || 
    (otherParticipant?.user 
      ? `${otherParticipant.user?.firstName || ''} ${otherParticipant.user?.lastName || ''}`.trim()
      : otherParticipant?.deletedUserEmail || 'Usuario eliminado') ||
    (otherParticipant?.user?.email || 'Usuario')

  // ✅ NUEVO: Obtener mensajes directamente del servicio (ya incluye optimistic updates)
  const messages = conversationId ? getMessages(conversationId) : []
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // ✅ NUEVO: Unirse a conversación y cargar mensajes históricos
  useEffect(() => {
    if (conversationId && !conversationId.startsWith('temp-')) {
      if (lastFetchedConversationRef.current !== conversationId) {
        lastFetchedConversationRef.current = conversationId
        
        if (isConnected) {
          joinConversation(conversationId)
        }
        
        loadMessages(conversationId, 1, 50).then(() => {
          markAsRead(conversationId)
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

  // ✅ Marcar como leído solo cuando la ventana NO está minimizada y el usuario está viendo
  useEffect(() => {
    if (!conversationId || sortedMessages.length === 0 || isMinimized) return
    
    const hasUnread = sortedMessages.some(msg => 
      msg.senderId !== user?.id && msg.status !== 'READ'
    )
    
    if (hasUnread) {
      // Delay para evitar marcar como leído demasiado rápido
      const timeoutId = setTimeout(() => {
        markAsRead(conversationId)
      }, 2000) // Esperar 2 segundos antes de marcar como leído
      
      return () => clearTimeout(timeoutId)
    }
  }, [conversationId, sortedMessages.length, user?.id, markAsRead, lastMessage, isMinimized])

  // Scroll al final
  useEffect(() => {
    if (!isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [sortedMessages, isMinimized])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  // ✅ NUEVO: Enviar mensaje usando el servicio (con queue automático y optimistic updates)
  const handleSend = () => {
    if (!message.trim() || !conversationId || isSending) return

    const messageText = message.trim()
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    setIsSending(true)
    try {
      // ✅ El servicio maneja automáticamente:
      // - Queue si está desconectado
      // - Optimistic updates
      // - ACK handling
      sendMessage(conversationId, messageText, 'TEXT')
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      setMessage(messageText)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!conversation) return null

  const defaultPosition = position || { x: window.innerWidth - 380, y: 100 }

  return (
    <div
      ref={windowRef}
      className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-2xl flex flex-col z-[100]"
      style={{
        width: '360px',
        height: isMinimized ? '60px' : '500px',
        right: `${window.innerWidth - defaultPosition.x}px`,
        top: `${defaultPosition.y}px`,
        transition: 'height 0.3s ease',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/50 cursor-move">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#66DEDB] bg-gray-700 flex-shrink-0">
            {otherParticipant?.user?.profile?.avatar ? (
              <Image
                src={otherParticipant.user?.profile?.avatar || ''}
                alt={displayName}
                width={32}
                height={32}
                className="object-cover w-full h-full"
                unoptimized={(otherParticipant.user?.profile?.avatar || '').startsWith('http')}
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
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                {(otherParticipant?.user?.firstName?.[0] || otherParticipant?.user?.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            {!isMinimized && (
              <p className="text-xs text-gray-400">En línea</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMinimized ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {sortedMessages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                No hay mensajes aún
              </div>
            ) : (
              sortedMessages.map((msg) => {
                const isOwn = msg.senderId === user?.id
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        isOwn
                          ? 'bg-[#66DEDB] text-gray-900'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-gray-700' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe un mensaje..."
                className="flex-1 resize-none bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#66DEDB] max-h-[120px]"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isSending || !isConnected}
                className="p-2 bg-[#66DEDB] hover:bg-[#5accc9] text-gray-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            {!isConnected && (
              <p className="text-xs text-yellow-400 mt-2 px-3">
                ⚠️ Reconectando... Los mensajes se enviarán automáticamente al reconectar.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

