'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import { useChat } from '@/lib/hooks/use-chat'
import { useSocket } from '@/lib/hooks/use-socket'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Conversation } from '@/lib/hooks/use-chat'

interface MessagesDropdownProps {
  isOpen: boolean
  onClose: () => void
  onOpenChat: (conversationId: string) => void
}

export function MessagesDropdown({ isOpen, onClose, onOpenChat }: MessagesDropdownProps) {
  const { conversations, isLoading, getOtherParticipant, getUnreadCountForConversation, getAllMessagesForConversation, lastReceivedMessage, fetchMessages, getMessages, sendMessage: sendMessageChat, markAsRead } = useChat()
  const { socket, isConnected, joinConversation, sendMessage: sendSocketMessage, getMessages: getSocketMessages, markAsRead: markAsReadSocket } = useSocket()
  const { user } = useAuthStore()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastFetchedConversationRef = useRef<string | null>(null)

  // Filtrar solo conversaciones tipo FRIENDS
  const friendsConversations = conversations.filter(c => c.type === 'FRIENDS')
  
  // Obtener conversación seleccionada
  const selectedConversation = selectedConversationId 
    ? conversations.find(c => c.id === selectedConversationId) 
    : null

  // Obtener mensajes de la conversación seleccionada
  const apiMessages = selectedConversationId ? getMessages(selectedConversationId) : []
  const socketMessages = selectedConversationId ? getSocketMessages(selectedConversationId) : []
  
  // ✅ Usar useMemo para evitar recálculos innecesarios
  const messages = useMemo(() => {
    const allMessages = [...apiMessages]
    socketMessages.forEach(socketMsg => {
      if (!allMessages.find(m => m.id === socketMsg.id) && socketMsg.senderId !== user?.id) {
        allMessages.push(socketMsg)
      }
    })
    return allMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [apiMessages, socketMessages, user?.id])

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversationId && !selectedConversationId.startsWith('temp-')) {
      if (lastFetchedConversationRef.current !== selectedConversationId) {
        lastFetchedConversationRef.current = selectedConversationId
        
        if (isConnected) {
          joinConversation(selectedConversationId)
        }
        
        fetchMessages(selectedConversationId).then(() => {
          // Marcar como leído solo después de cargar los mensajes
          // Esto asegura que el usuario realmente está viendo el chat
          if (markAsReadSocket) {
            // Delay para asegurar que el chat está visible
            setTimeout(() => {
              markAsRead(selectedConversationId, markAsReadSocket)
            }, 500)
          }
        }).catch((err) => {
          console.error('Error cargando mensajes:', err)
        })
      }
      // NO marcar como leído si ya se cargó antes - solo cuando el usuario hace click en el chat
    }
  }, [selectedConversationId, isConnected, fetchMessages, joinConversation, markAsRead, markAsReadSocket])

  // ✅ Marcar como leído cuando llegan nuevos mensajes y el chat está ABIERTO Y VISIBLE
  // Solo marcar como leído si el dropdown está abierto Y hay un chat seleccionado
  useEffect(() => {
    // Solo marcar como leído si:
    // 1. El dropdown está abierto (isOpen)
    // 2. Hay un chat seleccionado (selectedConversationId)
    // 3. Hay mensajes
    // 4. El socket está disponible
    if (isOpen && selectedConversationId && messages.length > 0 && markAsReadSocket) {
      // Marcar como leído automáticamente cuando hay nuevos mensajes (por Socket)
      const hasUnread = messages.some(msg => 
        msg.senderId !== user?.id && msg.status !== 'READ'
      )
      if (hasUnread) {
        markAsRead(selectedConversationId, markAsReadSocket)
      }
    }
  }, [isOpen, messages, selectedConversationId, markAsReadSocket, user?.id, markAsRead])

  // Scroll al final
  useEffect(() => {
    if (messagesEndRef.current && selectedConversationId) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, selectedConversationId])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  // Reset cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setSelectedConversationId(null)
      setMessage('')
    }
  }, [isOpen])

  // Memoizar datos de cada conversación
  // NO poner unreadCount = 0 solo por estar seleccionado
  // El indicador debe desaparecer solo cuando realmente se marca como leído
  const conversationsData = useMemo(() => {
    return friendsConversations.map(conversation => {
      const allMessages = getAllMessagesForConversation(conversation.id)
      // ✅ Calcular correctamente, sin forzar a 0 solo por estar seleccionado
      const unreadCount = getUnreadCountForConversation(conversation.id, user?.id || '')
      return {
        conversation,
        lastMessage: allMessages[0]?.content || 'Sin mensajes',
        lastMessageTime: allMessages[0]?.createdAt || conversation.updatedAt,
        unreadCount,
      }
    })
  }, [friendsConversations, getAllMessagesForConversation, getUnreadCountForConversation, user?.id, lastReceivedMessage])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const handleSend = async () => {
    if (!message.trim() || !selectedConversationId || isSending) return

    // Verificar que el socket esté conectado antes de enviar
    if (!isConnected || !sendSocketMessage) {
      console.error('Error: Socket no conectado')
      // ✅ Mostrar mensaje al usuario en lugar de solo log
      alert('El chat no está conectado. Por favor, espera un momento e intenta de nuevo.')
      return
    }

    // Asegurar que el socket esté unido a la conversación antes de enviar
    // Esto es importante para que las notificaciones funcionen correctamente
    if (selectedConversationId && !selectedConversationId.startsWith('temp-')) {
      joinConversation(selectedConversationId)
    }

    const messageText = message.trim()
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    setIsSending(true)
    try {
      // Siempre usar sendMessageChat que maneja los mensajes optimistas correctamente
      // Pasar markAsReadSocket para que marque como leído automáticamente al enviar
      await sendMessageChat(selectedConversationId, messageText, 'TEXT', sendSocketMessage, markAsReadSocket)
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

  if (!isOpen) return null

  const otherParticipant = selectedConversation ? getOtherParticipant(selectedConversation, user?.id || '') : null
  const displayName = otherParticipant?.alias || 
    `${otherParticipant?.user.firstName || ''} ${otherParticipant?.user.lastName || ''}`.trim() ||
    otherParticipant?.user.email || 'Usuario'

  return (
    <div
      ref={dropdownRef}
      className={`absolute top-full right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col transition-all duration-200 ${
        selectedConversationId ? 'w-96' : 'w-80'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {selectedConversationId ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Botón atrás con flecha */}
            <button
              onClick={() => setSelectedConversationId(null)}
              className="flex-shrink-0 p-1.5 hover:bg-gray-800 rounded-full transition-colors"
              title="Volver a conversaciones"
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {/* Avatar y nombre */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#66DEDB] bg-gray-700 flex items-center justify-center flex-shrink-0">
              {otherParticipant?.user.profile?.avatar ? (
                <Image
                  src={otherParticipant.user.profile.avatar}
                  alt={displayName}
                  width={40}
                  height={40}
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
              <p className="text-xs text-gray-400">En línea</p>
            </div>
          </div>
        ) : (
          <h3 className="text-lg font-semibold text-white">Mensajes</h3>
        )}
      </div>

      {/* Contenido: Lista de conversaciones o Chat */}
      {selectedConversationId ? (
        <>
          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
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
      ) : (
        <>
          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#66DEDB]"></div>
              </div>
            ) : friendsConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <p className="text-sm">No tienes conversaciones</p>
                <p className="text-xs mt-1">Inicia una conversación desde tus amigos</p>
              </div>
            ) : (
              conversationsData.map(({ conversation, lastMessage, lastMessageTime, unreadCount }) => {
                const otherParticipant = getOtherParticipant(conversation, user?.id || '')
                if (!otherParticipant) return null

                const displayName = otherParticipant.alias || 
                  `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim() ||
                  otherParticipant.user.email
                const avatar = otherParticipant.user.profile?.avatar

                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversationId(conversation.id)
                    }}
                    className="w-full p-3 border-b border-gray-700 hover:bg-gray-800/50 transition-colors text-left flex items-center gap-3"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#66DEDB] bg-gray-700 flex items-center justify-center">
                        {avatar ? (
                          <Image
                            src={avatar}
                            alt={displayName}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                            unoptimized={avatar.startsWith('http')}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-semibold">
                            {(otherParticipant.user.firstName?.[0] || otherParticipant.user.email?.[0] || 'U').toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Badge azul Tanku de mensajes no leídos (sin número, solo indicador) */}
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#66DEDB] rounded-full border-2 border-gray-900"></div>
                      )}
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTime(lastMessageTime)}</span>
                      </div>
                      <p className={`text-xs truncate ${unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {lastMessage}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer - Link a mensajes completos */}
          <div className="p-3 border-t border-gray-700">
            <a
              href="/messages"
              className="block text-center text-sm text-[#66DEDB] hover:text-[#73FFA2] transition-colors font-medium"
            >
              Ver todos los mensajes
            </a>
          </div>
        </>
      )}
    </div>
  )
}
