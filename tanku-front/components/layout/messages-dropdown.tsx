'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useChat } from '@/lib/hooks/use-chat'
import { useChatService } from '@/lib/hooks/use-chat-service'
import { useAuthStore } from '@/lib/stores/auth-store'

interface MessagesDropdownProps {
  isOpen: boolean
  onClose: () => void
  onOpenChat: (conversationId: string) => void
}

export function MessagesDropdown({ isOpen, onClose, onOpenChat }: MessagesDropdownProps) {
  const { conversations, isLoading, getOtherParticipant, getUnreadCountForConversation, getAllMessagesForConversation, lastReceivedMessage } = useChat()
  const { isConnected, sendMessage, getMessages, markAsRead, loadMessages, joinConversation, lastMessage } = useChatService()
  const { user } = useAuthStore()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastFetchedConversationRef = useRef<string | null>(null)

  const rowDividerStyle = {
    borderImage: 'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
  } as const
  
  // Obtener conversación seleccionada
  const selectedConversation = selectedConversationId 
    ? conversations.find(c => c.id === selectedConversationId) 
    : null

  // ✅ NUEVO: Obtener mensajes directamente del servicio (ya están sincronizados)
  const messages = useMemo(() => {
    if (!selectedConversationId) return []
    const msgs = getMessages(selectedConversationId)
    return msgs.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [selectedConversationId, getMessages, lastMessage])

  // ✅ NUEVO: Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversationId && !selectedConversationId.startsWith('temp-')) {
      if (lastFetchedConversationRef.current !== selectedConversationId) {
        lastFetchedConversationRef.current = selectedConversationId
        
        if (isConnected) {
          joinConversation(selectedConversationId)
        }
        
        loadMessages(selectedConversationId, 1, 50).then(() => {
          setTimeout(() => {
            markAsRead(selectedConversationId)
          }, 500)
        }).catch((err) => {
          console.error('Error cargando mensajes:', err)
        })
      }
    }
  }, [selectedConversationId, isConnected, joinConversation, loadMessages, markAsRead])

  // ✅ NUEVO: Re-unión automática si se desconecta y reconecta
  useEffect(() => {
    if (selectedConversationId && isConnected && !selectedConversationId.startsWith('temp-')) {
      joinConversation(selectedConversationId)
    }
  }, [selectedConversationId, isConnected, joinConversation])

  // ✅ Marcar como leído solo cuando el dropdown está abierto Y el usuario está viendo el chat
  useEffect(() => {
    if (!isOpen || !selectedConversationId || messages.length === 0) return
    
    // Solo marcar como leído si hay mensajes no leídos Y el usuario está viendo el chat
    const hasUnread = messages.some(msg => 
      msg.senderId !== user?.id && msg.status !== 'READ'
    )
    
    if (hasUnread) {
      // Delay para evitar marcar como leído demasiado rápido
      const timeoutId = setTimeout(() => {
        markAsRead(selectedConversationId)
      }, 2000) // Esperar 2 segundos antes de marcar como leído
      
      return () => clearTimeout(timeoutId)
    }
  }, [isOpen, selectedConversationId, messages.length, user?.id, markAsRead, lastMessage])

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
    const friendsConversations = conversations.filter((c) => c.type === 'FRIENDS' && !c.id.startsWith('temp-'))

    return friendsConversations
      .map((conversation) => {
      const allMessages = getAllMessagesForConversation(conversation.id)
      // Solo mostrar conversaciones con mensajes reales
      if (allMessages.length === 0) {
        return null
      }
      // ✅ Calcular correctamente, sin forzar a 0 solo por estar seleccionado
      const unreadCount = getUnreadCountForConversation(conversation.id, user?.id || '')
      const otherParticipant = getOtherParticipant(conversation, user?.id || '')
      if (!otherParticipant) {
        return null
      }
      return {
        conversation,
        otherParticipant,
        lastMessage: allMessages[0]?.content || '',
        lastMessageTime: allMessages[0]?.createdAt || conversation.updatedAt,
        unreadCount,
      }
    })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter(({ otherParticipant }) => {
        const username = otherParticipant.user?.username?.toLowerCase() || ''
        const firstName = otherParticipant.user?.firstName?.toLowerCase() || ''
        const lastName = otherParticipant.user?.lastName?.toLowerCase() || ''
        const alias = otherParticipant.alias?.toLowerCase() || ''
        const deletedEmail = otherParticipant.deletedUserEmail?.toLowerCase() || ''
        const q = searchQuery.trim().toLowerCase()
        if (!q) return true
        return (
          username.includes(q) ||
          firstName.includes(q) ||
          lastName.includes(q) ||
          alias.includes(q) ||
          deletedEmail.includes(q)
        )
      })
  }, [conversations, getAllMessagesForConversation, getUnreadCountForConversation, getOtherParticipant, user?.id, lastReceivedMessage, searchQuery])

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

  // ✅ NUEVO: Enviar mensaje usando el servicio (con queue automático)
  const handleSend = () => {
    if (!message.trim() || !selectedConversationId || isSending) return

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
      sendMessage(selectedConversationId, messageText, 'TEXT')
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
  const displayName = otherParticipant?.user?.username ||
    otherParticipant?.alias ||
    `${otherParticipant?.user?.firstName || ''} ${otherParticipant?.user?.lastName || ''}`.trim() ||
    otherParticipant?.user?.email || 'Usuario'

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full z-50 mt-2 flex h-[500px] w-[400px] flex-col rounded-xl border border-[#414141] shadow-xl"
      style={{ backgroundColor: '#171B21' }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={rowDividerStyle}>
        {selectedConversationId ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Botón atrás con flecha */}
            <button
              onClick={() => setSelectedConversationId(null)}
              className="flex-shrink-0 rounded-full p-1.5 transition-colors hover:bg-white/10"
              title="Volver a conversaciones"
            >
              <svg className="w-5 h-5 text-[#D7D7D7] hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {/* Avatar y nombre */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#66DEDB] bg-gray-700 flex items-center justify-center flex-shrink-0">
              {otherParticipant?.user?.profile?.avatar ? (
                <Image
                  src={otherParticipant.user.profile.avatar}
                  alt={displayName}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                  unoptimized={(otherParticipant.user?.profile?.avatar || '').startsWith('http')}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                  {(otherParticipant?.user?.firstName?.[0] || otherParticipant?.user?.email?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src="/icons_tanku/tanku_nav_mensajes_verde_modal_abierto.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                  unoptimized
                />
                <h3 className="text-base font-semibold leading-none text-white">Conversaciones</h3>
              </div>
              <button
                type="button"
                onClick={() => window.location.assign('/messages?new=1')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#66DEDB] text-[#0B1217] transition-transform hover:scale-105"
                title="Nueva conversación"
              >
                <span className="text-[28px] leading-none">+</span>
              </button>
            </div>
            <div className="relative w-[82%]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversación..."
                className="tanku-pill-search-input h-8 w-full rounded-full border border-white/10 bg-transparent pl-9 pr-3 text-white placeholder:text-[#A7A7A7] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20"
              />
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#73FFA2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
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
          <div className="p-3 border-t bg-transparent" style={rowDividerStyle}>
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
      ) : (
        <>
          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#66DEDB]"></div>
              </div>
            ) : conversationsData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <p className="text-sm">No tienes conversaciones con mensajes</p>
                <p className="text-xs mt-1">Usa + para iniciar una nueva</p>
              </div>
            ) : (
              conversationsData.map(({ conversation, lastMessage, lastMessageTime, unreadCount }) => {
                const otherParticipant = getOtherParticipant(conversation, user?.id || '')
                if (!otherParticipant) return null
                
                // Validar: Si el usuario fue eliminado, user será null pero deletedUserEmail existirá
                if (!otherParticipant.user && !otherParticipant.deletedUserEmail) return null

                // Mostrar nombre: Usar user si existe, sino usar deletedUserEmail
                const displayName = otherParticipant.user?.username ||
                  otherParticipant.alias ||
                  (otherParticipant.user 
                    ? `${otherParticipant.user?.firstName || ''} ${otherParticipant.user?.lastName || ''}`.trim()
                    : otherParticipant.deletedUserEmail || 'Usuario eliminado') ||
                  (otherParticipant.user?.email || 'Usuario desconocido')
                
                const avatar = otherParticipant.user?.profile?.avatar

                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversationId(conversation.id)
                    }}
                    className="w-full p-3 border-b hover:bg-white/[0.03] transition-colors text-left flex items-center gap-3"
                    style={rowDividerStyle}
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
                            {(otherParticipant.user?.firstName?.[0] || 
                              otherParticipant.user?.email?.[0] || 
                              otherParticipant.deletedUserEmail?.[0] || 
                              'U').toUpperCase()}
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
                        <span className="text-sm text-gray-300 flex-shrink-0 ml-2">{formatTime(lastMessageTime)}</span>
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
          <div className="p-3 border-t" style={rowDividerStyle}>
            <Link href="/messages" className="block text-center text-sm font-medium leading-none text-[#73FFA2] transition-opacity hover:opacity-85">
              Ver todos los mensajes
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
