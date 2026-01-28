'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useChat } from '@/lib/hooks/use-chat'
import { useSocket } from '@/lib/hooks/use-socket'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Conversation } from '@/lib/hooks/use-chat'

interface FloatingChatWindowProps {
  conversationId: string
  conversation: Conversation | null
  onClose: () => void
  position?: { x: number; y: number }
}

export function FloatingChatWindow({ conversationId, conversation, onClose, position }: FloatingChatWindowProps) {
  const { sendMessage: sendMessageChat, fetchMessages, getMessages, markAsRead, getOtherParticipant, user } = useChat()
  const { socket, isConnected, joinConversation, sendMessage: sendSocketMessage, getMessages: getSocketMessages, markAsRead: markAsReadSocket } = useSocket()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [optimisticMessages, setOptimisticMessages] = useState<Array<{ id: string; content: string; createdAt: string; senderId: string }>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const lastFetchedConversationRef = useRef<string | null>(null)

  const otherParticipant = conversation ? getOtherParticipant(conversation, user?.id || '') : null
  const displayName = otherParticipant?.alias || 
    `${otherParticipant?.user.firstName || ''} ${otherParticipant?.user.lastName || ''}`.trim() ||
    otherParticipant?.user.email || 'Usuario'

  // Obtener mensajes
  const apiMessages = conversationId ? getMessages(conversationId) : []
  const socketMessages = conversationId ? getSocketMessages(conversationId) : []
  
  // Combinar mensajes: incluir todos los mensajes de API y de socket (incluyendo propios)
  const allMessages = [...apiMessages]
  socketMessages.forEach(socketMsg => {
    // Incluir todos los mensajes de socket, incluso los propios (para ver mensajes enviados inmediatamente)
    if (!allMessages.find(m => m.id === socketMsg.id)) {
      allMessages.push(socketMsg)
    }
  })
  
  // Agregar mensajes optimistas (excluir los que ya están en los mensajes reales)
  optimisticMessages.forEach(optMsg => {
    if (!allMessages.find(m => m.id === optMsg.id)) {
      allMessages.push({
        ...optMsg,
        conversationId: conversationId,
        type: 'TEXT' as const,
        status: 'SENT' as const,
        sender: {
          id: user?.id || '',
          email: user?.email || '',
          firstName: user?.firstName || null,
          lastName: user?.lastName || null,
          username: user?.username || null,
          profile: user?.profile || null,
        },
        senderAlias: null,
      })
    }
  })
  
  const messages = allMessages.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Cargar mensajes
  useEffect(() => {
    if (conversationId && !conversationId.startsWith('temp-')) {
      if (lastFetchedConversationRef.current !== conversationId) {
        lastFetchedConversationRef.current = conversationId
        
        if (isConnected) {
          joinConversation(conversationId)
        }
        
        fetchMessages(conversationId).then(() => {
          if (markAsReadSocket) {
            markAsRead(conversationId, markAsReadSocket)
          }
        }).catch((err) => {
          console.error('Error cargando mensajes:', err)
        })
      }
    }
  }, [conversationId, isConnected, fetchMessages, joinConversation, markAsRead, markAsReadSocket])

  // Marcar como leído
  useEffect(() => {
    if (conversationId && messages.length > 0 && markAsReadSocket) {
      markAsRead(conversationId, markAsReadSocket)
    }
  }, [conversationId, messages.length, markAsRead, markAsReadSocket])

  // Limpiar mensajes optimistas cuando llegan los mensajes reales
  useEffect(() => {
    if (optimisticMessages.length === 0) return
    
    const realMessages = [...apiMessages, ...socketMessages]
    
    // Si hay mensajes reales con el mismo contenido y senderId, limpiar el optimista
    setOptimisticMessages(prev => {
      return prev.filter(optMsg => {
        // Buscar si hay un mensaje real con el mismo contenido y senderId reciente (últimos 10 segundos)
        const hasRealMessage = realMessages.some(realMsg => 
          realMsg.senderId === optMsg.senderId &&
          realMsg.content === optMsg.content &&
          Math.abs(new Date(realMsg.createdAt).getTime() - new Date(optMsg.createdAt).getTime()) < 10000
        )
        return !hasRealMessage
      })
    })
  }, [apiMessages, socketMessages, optimisticMessages.length])

  // Scroll al final
  useEffect(() => {
    if (!isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isMinimized])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSend = async () => {
    if (!message.trim() || !conversationId || isSending) return

    const messageText = message.trim()
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Agregar mensaje optimista inmediatamente
    setOptimisticMessages(prev => [...prev, {
      id: tempId,
      content: messageText,
      createdAt: new Date().toISOString(),
      senderId: user?.id || '',
    }])
    
    setMessage('') // Limpiar input inmediatamente
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    setIsSending(true)
    try {
      if (isConnected) {
        sendSocketMessage(conversationId, messageText)
      } else {
        await sendMessageChat(conversationId, messageText, 'TEXT', sendSocketMessage)
      }
      // El mensaje optimista se reemplazará cuando llegue el ACK o el mensaje real
      // Limpiar mensaje optimista después de un tiempo (se reemplazará con el real)
      setTimeout(() => {
        setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
      }, 5000)
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      // Remover mensaje optimista si falla
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
      // Restaurar mensaje si falla
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
            {otherParticipant?.user.profile?.avatar ? (
              <Image
                src={otherParticipant.user.profile.avatar}
                alt={displayName}
                width={32}
                height={32}
                className="object-cover w-full h-full"
                unoptimized={otherParticipant.user.profile.avatar.startsWith('http')}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                {(otherParticipant?.user.firstName?.[0] || otherParticipant?.user.email?.[0] || 'U').toUpperCase()}
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
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                No hay mensajes aún
              </div>
            ) : (
              messages.map((msg) => {
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
                disabled={!message.trim() || isSending}
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
          </div>
        </>
      )}
    </div>
  )
}

