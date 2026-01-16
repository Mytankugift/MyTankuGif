'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@/lib/hooks/use-chat'
import { useSocket } from '@/lib/hooks/use-socket'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Conversation } from '@/lib/hooks/use-chat'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

interface StalkerGiftChatWindowProps {
  conversationId: string | null
  conversation: Conversation | null
}

export function StalkerGiftChatWindow({ conversationId, conversation }: StalkerGiftChatWindowProps) {
  const { sendMessage: sendMessageChat, fetchMessages, getMessages, markAsRead, getOtherParticipant, user } = useChat()
  const { socket, isConnected, joinConversation, sendMessage: sendSocketMessage, getMessages: getSocketMessages, getTypingUsers, markAsRead: markAsReadSocket } = useSocket()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastFetchedConversationRef = useRef<string | null>(null)

  const otherParticipant = conversation ? getOtherParticipant(conversation, user?.id || '') : null
  // Para StalkerGift, siempre usar alias (nunca nombres reales a menos que esté revelado)
  const displayName = otherParticipant?.alias || 'Anónimo'

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
          if (markAsReadSocket) {
            markAsRead(conversationId, markAsReadSocket)
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

  if (!conversation || !otherParticipant) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Selecciona una conversación para comenzar</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - SIN AVATAR (siempre anónimo) */}
      <div className="p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-3">
          {/* Icono genérico en lugar de avatar (siempre anónimo) */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-[#66DEDB] bg-[#66DEDB]/20 flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-[#66DEDB]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#73FFA2]">{displayName}</h3>
            <p className="text-xs text-gray-400">Chat anónimo</p>
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
        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.id
          // Para StalkerGift, usar alias (nunca nombre real a menos que esté revelado)
          const senderName = msg.senderAlias || 'Anónimo'

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
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
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
            placeholder="Escribe un mensaje anónimo..."
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

