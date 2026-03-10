/**
 * @deprecated Este hook está deprecado.
 * 
 * Usa `useChatService` (lib/hooks/use-chat-service.ts) en su lugar.
 * 
 * chatService ahora maneja:
 * - Chat
 * - Notificaciones  
 * - Presencia
 * 
 * TODO: Migrar todos los componentes que usan este hook a useChatService
 * Componentes pendientes de migración:
 * - components/products/share-product-modal.tsx
 * - components/wishlists/share-wishlist-modal.tsx
 * - components/stalkergift/stalkergift-chat-window.tsx
 * - components/posters/share-post-modal.tsx
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { initSocket, disconnectSocket, getSocket } from '@/lib/realtime/socket'
import { useAuthStore } from '@/lib/stores/auth-store'
import { chatService } from '@/lib/services/chat.service'

// Callback para actualizar último mensaje (sin refresh en background)
let updateConversationLastMessageCallback: ((conversationId: string, message: ChatMessage) => void) | null = null

export function setUpdateConversationLastMessageCallback(callback: (conversationId: string, message: ChatMessage) => void) {
  updateConversationLastMessageCallback = callback
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  senderAlias?: string | null
  content: string
  type: 'TEXT' | 'IMAGE' | 'FILE'
  status: 'SENT' | 'DELIVERED' | 'READ'
  createdAt: string
  sender: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    username: string | null
    profile: {
      avatar: string | null
      banner: string | null
      bio: string | null
    } | null
  }
}

export interface TypingIndicator {
  conversationId: string
  userId: string
  isTyping: boolean
}

export function useSocket() {
  const { token, user } = useAuthStore()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map())
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map())
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  // ✅ Estado para rastrear el último mensaje recibido (para que useChat reaccione)
  const [lastReceivedMessage, setLastReceivedMessage] = useState<ChatMessage | null>(null)

  // ✅ NUEVO: Verificar si ChatService está activo
  const isChatServiceActive = chatService.getConnectionState().isConnected

  // Inicializar socket
  useEffect(() => {
    if (!token || !user) {
      console.warn('⚠️ [SOCKET] No hay token o user, desconectando...')
      if (socket) {
        disconnectSocket()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    // ✅ NUEVO: Si ChatService está activo, no crear socket para chat
    if (isChatServiceActive) {
      console.log('ℹ️ [SOCKET] ChatService está activo, omitiendo inicialización de socket para chat')
      // Limpiar socket existente si hay
      if (socket) {
        disconnectSocket()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    console.log('🔌 [SOCKET] Inicializando socket con token...')
    const newSocket = initSocket(token)
    if (!newSocket) {
      console.error('❌ [SOCKET] No se pudo inicializar socket')
      setSocket(null)
      setIsConnected(false)
      return
    }

    setSocket(newSocket)

    // Verificar si ya está conectado
    if (newSocket.connected) {
      console.log('✅ [SOCKET] Ya estaba conectado')
      setIsConnected(true)
    }

    // Handlers de conexión
    const onConnect = () => {
      console.log('✅ [SOCKET] Conectado exitosamente')
      setIsConnected(true)
      
      // ✅ Re-unión automática a conversaciones activas al reconectar
      // Esto asegura que los mensajes sigan llegando después de una reconexión
      if (newSocket && messages.size > 0) {
        const activeConversations = Array.from(messages.keys())
        activeConversations.forEach(convId => {
          if (!convId.startsWith('temp-')) {
            newSocket.emit('chat:join', convId)
            console.log(`🔄 [SOCKET] Re-uniendo a conversación ${convId} después de reconexión`)
          }
        })
      }
    }

    const onDisconnect = (reason: string) => {
      console.log('❌ [SOCKET] Desconectado:', reason)
      setIsConnected(false)
    }

    const onConnectError = (error: Error) => {
      console.error('❌ [SOCKET] Error de conexión:', error.message)
      setIsConnected(false)
    }

    newSocket.on('connect', onConnect)
    newSocket.on('disconnect', onDisconnect)
    newSocket.on('connect_error', onConnectError)

    // Handler de eventos genéricos (solo para debug)
    const onEvent = (event: any) => {
      console.log('📨 [SOCKET] Evento recibido:', event.type)
    }
    newSocket.on('event', onEvent)

    // Cleanup
    return () => {
      console.log('🧹 [SOCKET] Limpiando listeners')
      newSocket.off('connect', onConnect)
      newSocket.off('disconnect', onDisconnect)
      newSocket.off('connect_error', onConnectError)
      newSocket.off('event', onEvent)
    }
  }, [token, user])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (socket) {
        socket.removeAllListeners()
      }
    }
  }, [socket])

  /**
   * Unirse a una conversación
   */
  const joinConversation = useCallback((conversationId: string) => {
    if (!socket || !isConnected) {
      console.warn('⚠️ [SOCKET] No conectado, no se puede unir a conversación')
      return
    }

    socket.emit('chat:join', conversationId)
  }, [socket, isConnected])

  // Escuchar eventos específicos de chat (NO genéricos)
  useEffect(() => {
    // ✅ NUEVO: No escuchar eventos de chat si ChatService está activo
    if (!socket || !isConnected || isChatServiceActive) {
      return
    }

    // Handler: Mensaje nuevo de otro usuario
    const onNewMessage = (message: ChatMessage) => {
      // NO agregar mensajes propios (ya se agregaron vía ACK)
      if (message.senderId === user?.id) {
        return
      }
      
      const conversationId = message.conversationId
      
      // ✅ Solo actualizar mensajes, sin callbacks (React controlará el ciclo)
      setMessages((prev) => {
        const conversationMessages = prev.get(conversationId) || []
        // ✅ Evitar procesar el mismo mensaje múltiples veces
        if (conversationMessages.find((m) => m.id === message.id)) {
          return prev // Ya existe, no hacer nada
        }
        
        console.log('📨 [SOCKET] Mensaje nuevo recibido:', {
          conversationId,
          senderId: message.senderId,
          content: message.content.substring(0, 50),
        })
        
        return new Map(prev).set(conversationId, [...conversationMessages, message])
      })
      
      // ✅ Actualizar estado para que useChat reaccione con useEffect
      setLastReceivedMessage(message)
    }
    
    // Handler: ACK de mensaje enviado (reemplaza optimista)
    const onSent = (data: { tempId?: string; message: ChatMessage }) => {
      const { tempId, message } = data
      const conversationId = message.conversationId
      
      console.log('✅ [SOCKET] ACK recibido para mensaje:', { tempId, messageId: message.id })
      
      // ✅ Solo actualizar mensajes, sin callbacks
      setMessages((prev) => {
        const conversationMessages = prev.get(conversationId) || []
        
        // Si hay tempId, reemplazar mensaje optimista
        if (tempId) {
          const filtered = conversationMessages.filter(m => m.id !== tempId)
          // Agregar mensaje real
          if (!filtered.find(m => m.id === message.id)) {
            return new Map(prev).set(conversationId, [...filtered, message])
          }
          return new Map(prev).set(conversationId, filtered)
        }
        
        // Si no hay tempId, solo agregar si no existe
        if (!conversationMessages.find(m => m.id === message.id)) {
          return new Map(prev).set(conversationId, [...conversationMessages, message])
        }
        return prev
      })
      
      // ✅ Actualizar estado para que useChat reaccione con useEffect (también para ACK)
      setLastReceivedMessage(message)
    }
    
    // Handler: Error al enviar mensaje
    const onError = (data: { tempId?: string; conversationId: string; error: string }) => {
      const { tempId, conversationId, error } = data
      
      console.error('❌ [SOCKET] Error enviando mensaje:', error)
      
      // Remover mensaje optimista si existe
      if (tempId) {
        setMessages((prev) => {
          const conversationMessages = prev.get(conversationId) || []
          const filtered = conversationMessages.filter(m => m.id !== tempId)
          return new Map(prev).set(conversationId, filtered)
        })
      }
      
      // Aquí podrías mostrar un toast o notificación de error
    }
    
    // Handler: Indicador de typing
    const onTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      const { conversationId: convId, userId: typingUserId, isTyping } = data
      
      if (typingUserId !== user?.id) {
        setTypingUsers((prev) => {
          const newMap = new Map(prev)
          const users = newMap.get(convId) || new Set<string>()
          
          if (isTyping) {
            users.add(typingUserId)
          } else {
            users.delete(typingUserId)
          }
          
          newMap.set(convId, users)
          return newMap
        })

        // Limpiar typing después de 3 segundos
        if (isTyping) {
          const timeoutId = setTimeout(() => {
            setTypingUsers((prev) => {
              const newMap = new Map(prev)
              const users = newMap.get(convId) || new Set<string>()
              users.delete(typingUserId)
              newMap.set(convId, users)
              return newMap
            })
          }, 3000)

          // Limpiar timeout anterior si existe
          const existingTimeout = typingTimeoutRef.current.get(convId)
          if (existingTimeout) {
            clearTimeout(existingTimeout)
          }
          typingTimeoutRef.current.set(convId, timeoutId)
        }
      }
    }
    
    // Handler: Confirmación de lectura
    const onRead = (data: { conversationId: string; readBy: string }) => {
      const { conversationId: convId } = data
      const currentUserId = user?.id
      
      // Verificar ANTES de setMessages si realmente hay cambios
      setMessages((prev) => {
        const conversationMessages = prev.get(convId) || []
        
        // Verificar si hay mensajes que necesitan actualización
        const needsUpdate = conversationMessages.some(
          msg => msg.senderId !== currentUserId && msg.status !== 'READ'
        )
        
        // Si no hay cambios, retornar el mismo Map sin modificar
        if (!needsUpdate) {
          return prev
        }
        
        // Solo actualizar si hay cambios
        const updated = conversationMessages.map((msg) => {
          if (msg.senderId !== currentUserId && msg.status !== 'READ') {
            return { ...msg, status: 'READ' as const }
          }
          return msg
        })
        
        return new Map(prev).set(convId, updated)
      })
    }
    
    // Registrar listeners
    // ✅ NUEVO: Solo registrar listeners de chat si ChatService NO está activo
    if (!isChatServiceActive) {
      socket.on('chat:new', onNewMessage)
      socket.on('chat:sent', onSent)
      socket.on('chat:error', onError)
      socket.on('chat:typing', onTyping)
      socket.on('chat:read', onRead)
    }
    
    // Cleanup
    return () => {
      if (!isChatServiceActive) {
        socket.off('chat:new', onNewMessage)
        socket.off('chat:sent', onSent)
        socket.off('chat:error', onError)
        socket.off('chat:typing', onTyping)
        socket.off('chat:read', onRead)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, user?.id, isChatServiceActive])

  /**
   * Salir de una conversación
   */
  const leaveConversation = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return

    socket.emit('chat:leave', conversationId)
    
    // Limpiar listeners
    socket.off('chat:message')
    socket.off('chat:typing')
    socket.off('chat:read')

    // Limpiar estado
    setMessages((prev) => {
      const newMap = new Map(prev)
      newMap.delete(conversationId)
      return newMap
    })

    setTypingUsers((prev) => {
      const newMap = new Map(prev)
      newMap.delete(conversationId)
      return newMap
    })
  }, [socket, isConnected])

  /**
   * Enviar mensaje (SOCKET ES EL CANAL PRINCIPAL)
   * Retorna tempId para manejar mensaje optimista
   */
  const sendMessage = useCallback((conversationId: string, content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT'): string | null => {
    if (!socket || !isConnected) {
      console.warn('⚠️ [SOCKET] No conectado, no se puede enviar mensaje')
      return null
    }

    if (!content || content.trim().length === 0) {
      console.warn('⚠️ [SOCKET] Mensaje vacío')
      return null
    }

    // Generar ID temporal para mensaje optimista
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    socket.emit('chat:send', {
      conversationId,
      content: content.trim(),
      type,
      tempId,
    }, (response: { success: boolean; messageId?: string; error?: string }) => {
      if (!response.success) {
        console.error('❌ [SOCKET] Error enviando mensaje:', response.error)
      }
    })

    return tempId
  }, [socket, isConnected])

  /**
   * Enviar indicador de typing
   */
  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!socket || !isConnected) return

    socket.emit('chat:typing', {
      conversationId,
      isTyping,
    })
  }, [socket, isConnected])

  /**
   * Marcar mensajes como leídos
   */
  const markAsRead = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return

    // ✅ Actualizar mensajes de socket optimistamente ANTES de enviar al servidor
    setMessages((prev) => {
      const conversationMessages = prev.get(conversationId) || []
      const updated = conversationMessages.map((msg) => {
        if (msg.senderId !== user?.id && msg.status !== 'READ') {
          return { ...msg, status: 'READ' as const }
        }
        return msg
      })
      const newMap = new Map(prev).set(conversationId, updated)
      
      // ✅ Forzar actualización de lastReceivedMessage para que useChat reaccione
      // Buscar el último mensaje de la conversación para actualizar lastReceivedMessage
      const lastMessage = updated[updated.length - 1]
      if (lastMessage) {
        setLastReceivedMessage({ ...lastMessage })
      }
      
      return newMap
    })

    socket.emit('chat:read', {
      conversationId,
    })
  }, [socket, isConnected, user?.id])

  /**
   * Cerrar conversación
   */
  const closeConversation = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return

    socket.emit('chat:close', {
      conversationId,
    })

    // Limpiar estado
    leaveConversation(conversationId)
  }, [socket, isConnected, leaveConversation])

  /**
   * Obtener mensajes de una conversación
   */
  const getMessages = useCallback((conversationId: string): ChatMessage[] => {
    return messages.get(conversationId) || []
  }, [messages])

  /**
   * Obtener usuarios escribiendo en una conversación
   */
  const getTypingUsers = useCallback((conversationId: string): string[] => {
    return Array.from(typingUsers.get(conversationId) || [])
  }, [typingUsers])

  return {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    markAsRead,
    closeConversation,
    getMessages,
    getTypingUsers,
    lastReceivedMessage, // ✅ Exponer para que useChat reaccione
    socketMessages: messages, // ✅ Exponer Map directamente para reactividad
  }
}

