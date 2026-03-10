'use client'

/**
 * Hook para usar el servicio de chat de forma reactiva
 * 
 * Proporciona:
 * - Estado reactivo de conexión y mensajes
 * - Métodos para interactuar con el chat
 * - Suscripciones automáticas a eventos
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { chatService, type ChatMessage } from '@/lib/services/chat.service'
import { useAuthStore } from '@/lib/stores/auth-store'

export function useChatService() {
  const { token, user } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map())
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map())
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null)
  const connectionStateRef = useRef(chatService.getConnectionState())

  // Inicializar servicio cuando hay usuario y token
  useEffect(() => {
    if (!user?.id || !token) {
      chatService.cleanup()
      setIsConnected(false)
      return
    }

    chatService.initialize(user.id, token)

    // Suscribirse a eventos
    const unsubscribeConnected = chatService.on('connected', () => {
      setIsConnected(true)
      connectionStateRef.current = chatService.getConnectionState()
    })

    const unsubscribeDisconnected = chatService.on('disconnected', () => {
      setIsConnected(false)
      connectionStateRef.current = chatService.getConnectionState()
    })

    // ✅ Handler para mensajes optimistas (mensajes enviados localmente)
    const unsubscribeOptimistic = chatService.on('message:optimistic', ({ message, tempId }: { message: ChatMessage; tempId?: string }) => {
      setMessages(prev => {
        const newMap = new Map(prev)
        const conversationMessages = newMap.get(message.conversationId) || []
        
        // Solo agregar si no existe (evitar duplicados)
        if (!conversationMessages.find(m => m.id === message.id || m.id === tempId)) {
          const updated = [...conversationMessages, message]
          updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          newMap.set(message.conversationId, updated)
        }
        return newMap
      })
    })

    const unsubscribeNewMessage = chatService.on('message:new', ({ message }: { message: ChatMessage }) => {
      setMessages(prev => {
        const newMap = new Map(prev)
        const conversationMessages = newMap.get(message.conversationId) || []
        // Solo agregar si no existe (evitar duplicados)
        if (!conversationMessages.find(m => m.id === message.id)) {
          const updated = [...conversationMessages, message]
          updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          newMap.set(message.conversationId, updated)
        }
        return newMap
      })
      setLastMessage(message)
    })

    // ✅ Handler para ACK de mensaje enviado (reemplaza mensaje optimista)
    const unsubscribeSentMessage = chatService.on('message:sent', ({ message, tempId }: { message: ChatMessage; tempId?: string }) => {
      setMessages(prev => {
        const newMap = new Map(prev)
        const conversationMessages = newMap.get(message.conversationId) || []
        
        // ✅ Filtrar mensaje optimista (tempId) y cualquier duplicado del mensaje real
        const filtered = conversationMessages.filter(m => 
          m.id !== tempId && // Remover mensaje optimista
          m.id !== message.id // Remover cualquier duplicado del mensaje real
        )
        
        // ✅ Agregar el mensaje real (sin duplicados)
        filtered.push(message)
        
        // Ordenar por fecha
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        
        newMap.set(message.conversationId, filtered)
        return newMap
      })
      setLastMessage(message)
    })

    const unsubscribeTypingStart = chatService.on('typing:start', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        const users = newMap.get(conversationId) || new Set()
        users.add(userId)
        newMap.set(conversationId, users)
        return newMap
      })
    })

    const unsubscribeTypingStop = chatService.on('typing:stop', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        const users = newMap.get(conversationId) || new Set()
        users.delete(userId)
        newMap.set(conversationId, users)
        return newMap
      })
    })

    // Sincronizar estado inicial (solo una vez, no polling)
    const syncState = () => {
      const state = chatService.getConnectionState()
      setIsConnected(state.isConnected)
      connectionStateRef.current = state
    }

    syncState()

    // Cleanup
    return () => {
      unsubscribeOptimistic()
      unsubscribeConnected()
      unsubscribeDisconnected()
      unsubscribeNewMessage()
      unsubscribeSentMessage()
      unsubscribeTypingStart()
      unsubscribeTypingStop()
    }
  }, [user?.id, token])

  // ✅ ELIMINADO: Sincronización periódica que causaba duplicados
  // Los eventos de socket ya actualizan el estado correctamente
  // Este setInterval estaba sobrescribiendo mensajes y causando pérdida de historial

  // Métodos
  const joinConversation = useCallback((conversationId: string) => {
    chatService.joinConversation(conversationId)
  }, [])

  const leaveConversation = useCallback((conversationId: string) => {
    chatService.leaveConversation(conversationId)
  }, [])

  const sendMessage = useCallback((conversationId: string, content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT'): string | null => {
    return chatService.sendMessage(conversationId, content, type)
  }, [])

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    chatService.sendTyping(conversationId, isTyping)
  }, [])

  const markAsRead = useCallback((conversationId: string) => {
    chatService.markAsRead(conversationId)
  }, [])

  const loadMessages = useCallback(async (conversationId: string, page: number = 1, limit: number = 50) => {
    return await chatService.loadMessages(conversationId, page, limit)
  }, [])

  const getMessages = useCallback((conversationId: string): ChatMessage[] => {
    return messages.get(conversationId) || chatService.getMessages(conversationId)
  }, [messages])

  const getTypingUsers = useCallback((conversationId: string): string[] => {
    const users = typingUsers.get(conversationId)
    if (users && users.size > 0) {
      return Array.from(users)
    }
    return chatService.getTypingUsers(conversationId)
  }, [typingUsers])

  return {
    // Estado
    isConnected,
    messages,
    typingUsers,
    lastMessage,
    connectionState: connectionStateRef.current,
    
    // Métodos
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    markAsRead,
    loadMessages,
    getMessages,
    getTypingUsers,
  }
}



