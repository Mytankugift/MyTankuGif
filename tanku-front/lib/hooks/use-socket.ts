'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { initSocket, disconnectSocket, getSocket } from '@/lib/realtime/socket'
import { useAuthStore } from '@/lib/stores/auth-store'

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
    if (!socket || !isConnected) return

    // Handler: Mensaje nuevo de otro usuario
    const onNewMessage = (message: ChatMessage) => {
      // NO agregar mensajes propios (ya se agregaron vía ACK)
      if (message.senderId === user?.id) {
        return
      }
      
      const conversationId = message.conversationId
      
      console.log('📨 [SOCKET] Mensaje nuevo recibido:', {
        conversationId,
        senderId: message.senderId,
        content: message.content.substring(0, 50),
      })
      
      // ✅ Solo actualizar mensajes, sin callbacks (React controlará el ciclo)
      setMessages((prev) => {
        const conversationMessages = prev.get(conversationId) || []
        // Evitar duplicados
        if (!conversationMessages.find((m) => m.id === message.id)) {
          return new Map(prev).set(conversationId, [...conversationMessages, message])
        }
        return prev
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
      
      setMessages((prev) => {
        const conversationMessages = prev.get(convId) || []
        const updated = conversationMessages.map((msg) => {
          if (msg.senderId !== user?.id && msg.status !== 'READ') {
            return { ...msg, status: 'READ' as const }
          }
          return msg
        })
        return new Map(prev).set(convId, updated)
      })
    }
    
    // Registrar listeners
    socket.on('chat:new', onNewMessage)
    socket.on('chat:sent', onSent)
    socket.on('chat:error', onError)
    socket.on('chat:typing', onTyping)
    socket.on('chat:read', onRead)
    
    // Cleanup
    return () => {
      socket.off('chat:new', onNewMessage)
      socket.off('chat:sent', onSent)
      socket.off('chat:error', onError)
      socket.off('chat:typing', onTyping)
      socket.off('chat:read', onRead)
    }
  }, [socket, isConnected, user?.id])

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

    socket.emit('chat:read', {
      conversationId,
    })
  }, [socket, isConnected])

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

