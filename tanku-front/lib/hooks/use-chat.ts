'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useSocket } from '@/lib/hooks/use-socket'
import type { ChatMessage } from '@/lib/hooks/use-socket'
import { useAuthStore } from '@/lib/stores/auth-store'
export interface Conversation {
  id: string
  type: 'FRIENDS' | 'STALKERGIFT'
  status: 'ACTIVE' | 'CLOSED'
  createdAt: string
  updatedAt: string
  participants: Array<{
    id: string
    userId: string
    alias?: string | null
    isRevealed: boolean
    user: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
      profile: {
        avatar: string | null
        banner: string | null
        bio: string | null
      } | null
    }
  }>
  messages?: Array<{
    id: string
    content: string
    createdAt: string
    senderId: string
    status: 'SENT' | 'DELIVERED' | 'READ'
  }>
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderAlias?: string | null
  content: string
  type: 'TEXT' | 'IMAGE' | 'FILE'
  status: 'SENT' | 'DELIVERED' | 'READ'
  readAt?: string | null
  createdAt: string
  sender: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    profile: {
      avatar: string | null
      banner: string | null
      bio: string | null
    } | null
  }
}

export function useChat() {
  const { user } = useAuthStore()
  // ✅ Obtener lastReceivedMessage y socketMessages directamente de useSocket
  const { lastReceivedMessage, socketMessages } = useSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map())
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const fetchedConversationsRef = useRef<Set<string>>(new Set()) // ✅ Evitar llamadas duplicadas

  /**
   * Cargar todas las conversaciones
   */
  const fetchConversations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<Conversation[]>(API_ENDPOINTS.CHAT.CONVERSATIONS)
      if (response.success && response.data) {
        // Ordenar por último mensaje (más reciente primero)
        const sorted = [...response.data].sort((a, b) => {
          const aTime = a.messages && a.messages.length > 0 
            ? new Date(a.messages[0].createdAt).getTime() 
            : new Date(a.updatedAt).getTime()
          const bTime = b.messages && b.messages.length > 0 
            ? new Date(b.messages[0].createdAt).getTime() 
            : new Date(b.updatedAt).getTime()
          return bTime - aTime // Más reciente primero
        })
        setConversations(sorted)
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar conversaciones')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Crear o obtener conversación con un usuario
   */
  const createOrGetConversation = useCallback(async (participantId: string, type: 'FRIENDS' | 'STALKERGIFT' = 'FRIENDS', alias?: { userId: string; participantId: string }) => {
    setIsLoading(true)
    setError(null)
    try {
      // Si la conversación es temporal (empieza con 'temp-'), crear la real
      const existingTemp = conversations.find(c => 
        c.id.startsWith('temp-') && 
        c.participants.some(p => p.userId === participantId)
      )
      
      if (existingTemp) {
        // Crear conversación real
        const response = await apiClient.post<Conversation>(API_ENDPOINTS.CHAT.CONVERSATIONS, {
          participantId,
          type,
          alias,
        })
        if (response.success && response.data) {
          // Actualizar lista de conversaciones
          await fetchConversations()
          return response.data
        }
      } else {
        // Buscar conversación existente
        const existing = conversations.find(c => 
          !c.id.startsWith('temp-') &&
          c.participants.some(p => p.userId === participantId)
        )
        
        if (existing) {
          return existing
        }
        
        // Crear nueva conversación
        const response = await apiClient.post<Conversation>(API_ENDPOINTS.CHAT.CONVERSATIONS, {
          participantId,
          type,
          alias,
        })
        if (response.success && response.data) {
          // Actualizar lista de conversaciones
          await fetchConversations()
          return response.data
        }
      }
      
      throw new Error('Error al crear conversación')
    } catch (err: any) {
      setError(err.message || 'Error al crear conversación')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [fetchConversations, conversations])

  /**
   * Cargar mensajes de una conversación
   */
  const fetchMessages = useCallback(async (conversationId: string, page: number = 1, limit: number = 50) => {
    // ✅ Evitar llamadas duplicadas usando ref
    const cacheKey = `${conversationId}-${page}`
    if (fetchedConversationsRef.current.has(cacheKey)) {
      // Ya se cargó esta conversación y página, retornar mensajes existentes
      return messages.get(conversationId) || []
    }
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<Message[]>(
        `${API_ENDPOINTS.CHAT.MESSAGES(conversationId)}?page=${page}&limit=${limit}`
      )
      if (response.success && response.data) {
        // ✅ Marcar como cargado
        fetchedConversationsRef.current.add(cacheKey)
        
        setMessages((prev) => {
          const newMap = new Map(prev)
          if (page === 1) {
            // Primera página, reemplazar
            newMap.set(conversationId, response.data!)
          } else {
            // Páginas siguientes, agregar al inicio
            const existing = newMap.get(conversationId) || []
            newMap.set(conversationId, [...response.data!, ...existing])
          }
          return newMap
        })
        return response.data
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar mensajes')
      // ✅ Si falla, permitir reintento removiendo del cache
      fetchedConversationsRef.current.delete(cacheKey)
    } finally {
      setIsLoading(false)
    }
  }, []) // ✅ Sin dependencias para evitar recreación constante

  /**
   * Enviar mensaje (SOLO por Socket - NO REST)
   * Retorna tempId para manejar mensaje optimista
   */
  const sendMessage = useCallback((conversationId: string, content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', sendMessageSocket: (convId: string, msg: string, msgType?: 'TEXT' | 'IMAGE' | 'FILE') => string | null) => {
    // Validar que no sea conversación temporal
    if (conversationId.startsWith('temp-')) {
      throw new Error('No se puede enviar mensaje a una conversación temporal. Crea la conversación primero.')
    }

    // Enviar por socket (retorna tempId)
    const tempId = sendMessageSocket(conversationId, content, type)
    
    if (!tempId) {
      throw new Error('Error al enviar mensaje por socket')
    }

    // Crear mensaje optimista
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: user?.id || '',
      content,
      type,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      sender: {
        id: user?.id || '',
        email: user?.email || '',
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        profile: user?.profile || null,
      },
    }

    // Agregar mensaje optimista al estado local
    setMessages((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(conversationId) || []
      if (!existing.find(m => m.id === tempId)) {
        newMap.set(conversationId, [...existing, optimisticMessage])
      }
      return newMap
    })
    
    // Actualizar última actividad de la conversación en la lista (optimista)
    setConversations((prev) => {
      return prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            updatedAt: new Date().toISOString(),
            messages: [{
              id: tempId,
              content,
              createdAt: optimisticMessage.createdAt,
              senderId: optimisticMessage.senderId,
              status: 'SENT',
            }],
          }
        }
        return conv
      })
    })
    
    return optimisticMessage
  }, [user])

  /**
   * Marcar mensajes como leídos (SOLO por Socket - NO REST)
   */
  const markAsRead = useCallback((conversationId: string, markAsReadSocket?: (convId: string) => void) => {
    if (!markAsReadSocket) {
      console.warn('⚠️ markAsReadSocket no disponible')
      return
    }

    // Marcar como leído por Socket
    markAsReadSocket(conversationId)
    
    // Actualizar estado local optimista (el socket confirmará después)
    setMessages((prev) => {
      const newMap = new Map(prev)
      const conversationMessages = newMap.get(conversationId) || []
      const updated = conversationMessages.map((msg) => {
        if (msg.senderId !== user?.id && msg.status !== 'READ') {
          return { ...msg, status: 'READ' as const }
        }
        return msg
      })
      newMap.set(conversationId, updated)
      return newMap
    })
    
    // Actualizar contador local (sin llamar API)
    const conversationMessages = messages.get(conversationId) || []
    const unreadInConv = conversationMessages.filter(msg => 
      msg.senderId !== user?.id && msg.status !== 'READ'
    ).length
    setUnreadCount((prev) => Math.max(0, prev - unreadInConv))
  }, [user, messages])

  /**
   * Cargar contador de no leídos
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get<{ count: number }>(API_ENDPOINTS.CHAT.UNREAD_COUNT)
      if (response.success && response.data) {
        setUnreadCount(response.data.count)
      }
    } catch (err) {
      console.error('Error cargando contador:', err)
    }
  }, [])

  /**
   * Cerrar conversación
   */
  const closeConversation = useCallback(async (conversationId: string) => {
    try {
      await apiClient.put(API_ENDPOINTS.CHAT.CLOSE(conversationId))
      await fetchConversations()
    } catch (err: any) {
      setError(err.message || 'Error al cerrar conversación')
    }
  }, [fetchConversations])

  /**
   * Obtener mensajes de una conversación del estado local
   */
  const getMessages = useCallback((conversationId: string): Message[] => {
    return messages.get(conversationId) || []
  }, [messages])

  /**
   * ✅ Función centralizada: Obtener TODOS los mensajes de una conversación (combinando todas las fuentes)
   * Single source of truth para mensajes
   */
  const getAllMessagesForConversation = useCallback((conversationId: string): Message[] => {
    const conversation = conversations.find(c => c.id === conversationId)
    
    // 1. Mensajes cargados vía API (del Map de useChat) - Ya son Message[] completos
    const apiMessages = messages.get(conversationId) || []
    
    // 2. Mensajes de Socket (del Map de useSocket) - convertir ChatMessage a Message
    // ✅ Usar socketMessages directamente para mejor reactividad
    const socketMessagesRaw = socketMessages.get(conversationId) || []
    const socketMessagesNormalized: Message[] = socketMessagesRaw.map((msg: ChatMessage) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderAlias: msg.senderAlias,
      content: msg.content,
      type: msg.type,
      status: msg.status,
      readAt: null,
      createdAt: msg.createdAt,
      sender: msg.sender, // ✅ Incluir sender completo de ChatMessage
    }))
    
    // 3. Mensajes de la conversación (del array messages en Conversation) - normalizar a Message completo
    const conversationMessagesRaw = conversation?.messages || []
    const conversationMessages: Message[] = conversationMessagesRaw.map(msg => {
      // Buscar el sender en los participantes de la conversación
      const senderParticipant = conversation?.participants.find(p => p.userId === msg.senderId)
      const sender = senderParticipant?.user || {
        id: msg.senderId,
        email: '',
        firstName: null,
        lastName: null,
        profile: null,
      }
      
      return {
        id: msg.id,
        conversationId,
        senderId: msg.senderId,
        senderAlias: senderParticipant?.alias || null,
        content: msg.content,
        type: 'TEXT' as const, // conversation.messages no tiene type, asumir TEXT
        status: msg.status,
        readAt: null,
        createdAt: msg.createdAt,
        sender,
      }
    })
    
    // 4. Combinar y deduplicar (por ID) - prioridad: socket > API > conversation
    const allMessagesMap = new Map<string, Message>()
    
    // ✅ Agregar en orden de prioridad: conversation primero, luego API, luego socket (socket tiene prioridad final)
    // Esto asegura que si un mensaje existe en múltiples fuentes, el de socket (más reciente) prevalece
    ;[...conversationMessages, ...apiMessages, ...socketMessagesNormalized].forEach(msg => {
      // Si ya existe, solo reemplazar si el nuevo viene de socket (prioridad más alta)
      if (!allMessagesMap.has(msg.id)) {
        allMessagesMap.set(msg.id, msg)
      } else {
        // Si el mensaje nuevo es de socket y el existente no, reemplazar
        const isNewFromSocket = socketMessagesNormalized.some(m => m.id === msg.id)
        if (isNewFromSocket) {
          allMessagesMap.set(msg.id, msg)
        }
      }
    })
    
    // 5. Ordenar por fecha (más reciente primero)
    return Array.from(allMessagesMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [conversations, messages, socketMessages, lastReceivedMessage]) // ✅ Agregar socketMessages y lastReceivedMessage para reactividad

  /**
   * Obtener contador de mensajes no leídos para una conversación específica
   * ✅ Usa la función centralizada getAllMessagesForConversation
   */
  const getUnreadCountForConversation = useCallback((conversationId: string, currentUserId: string) => {
    const allMessages = getAllMessagesForConversation(conversationId)
    return allMessages.filter(msg => 
      msg.senderId !== currentUserId && msg.status !== 'READ'
    ).length
  }, [getAllMessagesForConversation])

  /**
   * Obtener el total de mensajes no leídos de todas las conversaciones
   * ✅ Para mostrar badge en el botón de mensajes
   */
  const getTotalUnreadCount = useCallback((currentUserId: string) => {
    return conversations.reduce((total, conversation) => {
      return total + getUnreadCountForConversation(conversation.id, currentUserId)
    }, 0)
  }, [conversations, getUnreadCountForConversation])

  /**
   * Obtener el otro participante de una conversación
   */
  const getOtherParticipant = useCallback((conversation: Conversation, currentUserId: string) => {
    return conversation.participants.find((p) => p.userId !== currentUserId)
  }, [])

  /**
   * Actualizar último mensaje de una conversación (optimista, sin llamar API)
   * ✅ Usa message.createdAt para el tiempo real del mensaje
   */
  const updateConversationLastMessage = useCallback((conversationId: string, message: ChatMessage) => {
    setConversations((prev) => {
      const updated = prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            updatedAt: message.createdAt, // ✅ Usar createdAt del mensaje, no new Date()
            messages: [{
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.senderId,
              status: message.status,
            }],
          }
        }
        return conv
      })
      
      // Reordenar: mover la conversación actualizada al principio
      const updatedConv = updated.find(c => c.id === conversationId)
      if (updatedConv) {
        const others = updated.filter(c => c.id !== conversationId)
        return [updatedConv, ...others]
      }
      
      return updated
    })
  }, [])

  // ✅ Reaccionar a cambios en mensajes recibidos vía socket (forma correcta con useEffect)
  useEffect(() => {
    if (!lastReceivedMessage) return

    console.log('🔄 [useChat] Actualizando último mensaje de conversación:', {
      conversationId: lastReceivedMessage.conversationId,
      messageId: lastReceivedMessage.id,
      content: lastReceivedMessage.content.substring(0, 30),
    })

    // Actualizar último mensaje en la lista de conversaciones
    // React controla cuándo ejecutar esto (después del render)
    updateConversationLastMessage(
      lastReceivedMessage.conversationId,
      lastReceivedMessage
    )
  }, [lastReceivedMessage, updateConversationLastMessage])

  // Cargar conversaciones al montar (SOLO una vez, el socket es la fuente de verdad)
  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      if (mounted) {
        await fetchConversations()
        await fetchUnreadCount() // Solo una vez al montar
      }
    }
    
    loadData()
    
    // ❌ ELIMINADO: Ya no necesitamos el callback global
    // El useEffect anterior maneja las actualizaciones de forma reactiva
    
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ✅ Solo ejecutar una vez al montar

  return {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    isLoading,
    error,
    unreadCount,
    fetchConversations,
    createOrGetConversation,
    fetchMessages,
    sendMessage,
    markAsRead,
    closeConversation,
    getMessages,
    getAllMessagesForConversation, // ✅ Exponer función centralizada
    getOtherParticipant,
    getUnreadCountForConversation,
    getTotalUnreadCount, // ✅ Exponer para badge en navegación
    fetchUnreadCount,
    lastReceivedMessage, // ✅ Exponer para forzar re-render en conversation-list
    user, // Exponer user para que ChatWindow pueda usarlo
  }
}

