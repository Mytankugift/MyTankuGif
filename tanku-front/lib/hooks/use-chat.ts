'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { chatService, type ChatMessage as ChatServiceMessage } from '@/lib/services/chat.service'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useFeedInitContext } from '@/lib/context/feed-init-context'
export interface Conversation {
  id: string
  type: 'FRIENDS' | 'STALKERGIFT'
  status: 'ACTIVE' | 'CLOSED'
  createdAt: string
  updatedAt: string
  participants: Array<{
    id: string
    userId: string | null
    deletedUserEmail?: string | null
    alias?: string | null
    isRevealed: boolean
    user: {
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
    } | null
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
  senderId: string | null
  senderAlias?: string | null
  deletedSenderEmail?: string | null
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
    username: string | null
    profile: {
      avatar: string | null
      banner: string | null
      bio: string | null
    } | null
  } | null
}

export function useChat() {
  const { user } = useAuthStore()
  const { isComplete, hasData } = useFeedInitContext()
  // ✅ NUEVO: Usar ChatService en lugar de useSocket para mensajes
  const [lastReceivedMessage, setLastReceivedMessage] = useState<Message | null>(null)
  const [socketMessages, setSocketMessages] = useState<Map<string, Message[]>>(new Map())
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map())
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const fetchedConversationsRef = useRef<Set<string>>(new Set()) // ✅ Evitar llamadas duplicadas

  // Función helper para convertir ChatServiceMessage a Message
  const convertChatMessageToMessage = useCallback((chatMsg: ChatServiceMessage): Message => {
    return {
      id: chatMsg.id,
      conversationId: chatMsg.conversationId,
      senderId: chatMsg.senderId,
      senderAlias: chatMsg.senderAlias,
      deletedSenderEmail: chatMsg.deletedSenderEmail,
      content: chatMsg.content,
      type: chatMsg.type,
      status: chatMsg.status,
      createdAt: chatMsg.createdAt,
      sender: chatMsg.sender,
    }
  }, [])

  // ✅ NUEVO: Suscribirse a eventos de ChatService
  useEffect(() => {
    if (!user?.id) {
      setLastReceivedMessage(null)
      setSocketMessages(new Map())
      return
    }

    // Obtener estado inicial
    const updateFromService = () => {
      const lastMsg = chatService.getLastReceivedMessage()
      const allMsgs = chatService.getAllMessages()
      
      // Convertir ChatMessage a Message
      const convertedMessages = new Map<string, Message[]>()
      allMsgs.forEach((msgs, convId) => {
        convertedMessages.set(convId, msgs.map(convertChatMessageToMessage))
      })
      
      setSocketMessages(convertedMessages)
      if (lastMsg) {
        setLastReceivedMessage(convertChatMessageToMessage(lastMsg))
      }
    }

    updateFromService()

    // Suscribirse a nuevos mensajes (actualización en tiempo real vía Socket.IO)
    const unsubscribe = chatService.on('message:new', ({ message }: { message: ChatServiceMessage }) => {
      const converted = convertChatMessageToMessage(message)
      setLastReceivedMessage(converted)
      
      setSocketMessages(prev => {
        const newMap = new Map(prev)
        const conversationMessages = newMap.get(message.conversationId) || []
        if (!conversationMessages.find(m => m.id === message.id)) {
          newMap.set(message.conversationId, [...conversationMessages, converted])
        }
        return newMap
      })
    })

    return () => {
      unsubscribe()
    }
  }, [user?.id, convertChatMessageToMessage])

  /**
   * Cargar todas las conversaciones
   */
  const fetchConversations = useCallback(async () => {
    // ✅ Verificar autenticación antes de hacer la llamada
    if (!user?.id) {
      console.log('[useChat] Usuario no autenticado, omitiendo fetchConversations')
      return
    }

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
      // ✅ Solo mostrar error si el usuario está autenticado
      if (user?.id) {
        setError(err.message || 'Error al cargar conversaciones')
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // ✅ ELIMINADO: useEffect duplicado consolidado en el useEffect más abajo

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
   * También marca como leído automáticamente (si el usuario está enviando, está leyendo)
   */
  const sendMessage = useCallback((conversationId: string, content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', sendMessageSocket: (convId: string, msg: string, msgType?: 'TEXT' | 'IMAGE' | 'FILE') => string | null, markAsReadSocket?: (convId: string) => void) => {
    // Validar que no sea conversación temporal
    if (conversationId.startsWith('temp-')) {
      throw new Error('No se puede enviar mensaje a una conversación temporal. Crea la conversación primero.')
    }

    // Enviar por socket (retorna tempId)
    const tempId = sendMessageSocket(conversationId, content, type)
    
    if (!tempId) {
      throw new Error('Error al enviar mensaje por socket. Verifica que el socket esté conectado.')
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
        username: user?.username || null,
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
      
      // Marcar como leído todos los mensajes anteriores cuando se envía un mensaje
      // (si el usuario está enviando, está activamente leyendo)
      if (user?.id && markAsReadSocket) {
        const updated = newMap.get(conversationId)?.map((msg) => {
          if (msg.senderId !== user.id && msg.status !== 'READ') {
            return { ...msg, status: 'READ' as const }
          }
          return msg
        }) || []
        newMap.set(conversationId, updated)
        
        // Marcar como leído por socket
        markAsReadSocket(conversationId)
        
        // Recalcular contador
        let totalUnread = 0
        newMap.forEach((convMessages) => {
          totalUnread += convMessages.filter(msg => 
            msg.senderId !== user.id && msg.status !== 'READ'
          ).length
        })
        setUnreadCount(totalUnread)
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
              senderId: optimisticMessage.senderId || user?.id || '',
              status: 'SENT' as const,
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
    
    // Recalcular contador después de actualizar el estado
    // Usar setTimeout para que se ejecute después de que el estado se actualice
    if (user?.id) {
      setTimeout(() => {
        // Calcular contador usando todos los mensajes (incluyendo socket)
        // Acceder al estado actual de messages usando una función
        setMessages((currentMessages) => {
          let totalUnread = 0
          conversations.forEach(conv => {
            const apiMessages = currentMessages.get(conv.id) || []
            const socketMessagesRaw = socketMessages.get(conv.id) || []
            const allConvMessages = [...apiMessages, ...socketMessagesRaw]
            totalUnread += allConvMessages.filter(msg => 
              msg.senderId !== user.id && msg.status !== 'READ'
            ).length
          })
          setUnreadCount(totalUnread)
          return currentMessages // Retornar sin cambios
        })
      }, 100) // Aumentar delay para asegurar que el estado se actualice
    }
  }, [user, conversations, socketMessages])

  /**
   * Cargar contador de no leídos
   */
  const fetchUnreadCount = useCallback(async () => {
    // ✅ Verificar autenticación antes de hacer la llamada
    if (!user?.id) {
      console.log('[useChat] Usuario no autenticado, omitiendo fetchUnreadCount')
      return
    }

    try {
      const response = await apiClient.get<{ count: number }>(API_ENDPOINTS.CHAT.UNREAD_COUNT)
      if (response.success && response.data) {
        setUnreadCount(response.data.count)
      }
    } catch (err) {
      // ✅ Solo loggear si el usuario está autenticado
      if (user?.id) {
        console.error('Error cargando contador:', err)
      }
    }
  }, [user?.id])

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
    const socketMessagesNormalized: Message[] = socketMessagesRaw.map((msg: Message) => ({
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
      // Si el usuario fue eliminado, user será null pero deletedUserEmail existirá
      const sender = senderParticipant?.user || null
      const deletedSenderEmail = senderParticipant?.deletedUserEmail || null
      
      return {
        id: msg.id,
        conversationId,
        senderId: msg.senderId,
        senderAlias: senderParticipant?.alias || null,
        deletedSenderEmail,
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
  const updateConversationLastMessage = useCallback((conversationId: string, message: Message) => {
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
              senderId: message.senderId || user?.id || '', // ✅ Asegurar que senderId no sea null
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
  // ✅ NUEVO: Usar useRef para evitar loop infinito
  const lastProcessedMessageRef = useRef<string | null>(null)
  
  useEffect(() => {
    if (!lastReceivedMessage) return

    // ✅ Evitar procesar el mismo mensaje múltiples veces
    if (lastProcessedMessageRef.current === lastReceivedMessage.id) {
      return
    }

    lastProcessedMessageRef.current = lastReceivedMessage.id

    console.log('🔄 [useChat] Actualizando último mensaje de conversación:', {
      conversationId: lastReceivedMessage.conversationId,
      messageId: lastReceivedMessage.id,
      content: lastReceivedMessage.content.substring(0, 30),
    })

    // Actualizar último mensaje en la lista de conversaciones
    updateConversationLastMessage(
      lastReceivedMessage.conversationId,
      lastReceivedMessage
    )
  }, [lastReceivedMessage, updateConversationLastMessage])

  // ✅ Guard para evitar llamadas duplicadas
  const hasLoadedRef = useRef<boolean>(false)
  const lastUserIdRef = useRef<string | null>(null)

  // Cargar conversaciones al montar (SOLO una vez, el socket es la fuente de verdad)
  useEffect(() => {
    // ✅ Verificar autenticación antes de hacer cualquier llamada
    if (!user?.id) {
      // Silencioso: no hacer logs innecesarios en landing
      hasLoadedRef.current = false
      lastUserIdRef.current = null
      return
    }

    // ✅ Si ya se cargó para este usuario, no volver a cargar
    if (hasLoadedRef.current && lastUserIdRef.current === user.id) {
      return
    }

    // ✅ Verificar si feedInit ya completó usando sessionStorage y eventos
    const checkFeedInitComplete = () => {
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem('feedInit_complete') === 'true'
      }
      return false
    }
    
    // ✅ Listener para evento de feedInit completado
    const handleFeedInitComplete = (event: CustomEvent) => {
      // ✅ Si feedInit ya cargó y hay conversaciones, no hacer fetch
      if (conversations.length > 0 && !hasLoadedRef.current) {
        console.log('[useChat] feedInit completó y ya hay conversaciones, omitiendo fetch')
        hasLoadedRef.current = true
        lastUserIdRef.current = user.id
        // Solo hacer fetch de unreadCount si no está disponible
        if (unreadCount === 0) {
          fetchUnreadCount()
        }
      }
    }
    
    // ✅ Agregar listener para evento feedInit_complete
    if (typeof window !== 'undefined') {
      window.addEventListener('feedInit_complete', handleFeedInitComplete as EventListener)
    }
    
    // ✅ Verificar periódicamente si feedInit ya cargó antes de hacer fetch
    // Esto evita llamadas duplicadas cuando feedInit está cargando
    let checkAttempts = 0
    const maxAttempts = 40 // ✅ Máximo 40 intentos (8 segundos si feedInit tarda mucho)
    let checkInterval: NodeJS.Timeout | null = null
    
    checkInterval = setInterval(() => {
      checkAttempts++
      
      // ✅ Verificar si feedInit ya completó
      if (checkFeedInitComplete()) {
        // ✅ Si ya hay conversaciones cargadas (desde feedInit), no hacer fetch
        if (conversations.length > 0 && !hasLoadedRef.current) {
          console.log('[useChat] feedInit completó y ya hay conversaciones, omitiendo fetch')
          if (checkInterval) {
            clearInterval(checkInterval)
          }
          hasLoadedRef.current = true
          lastUserIdRef.current = user.id
          // Solo hacer fetch de unreadCount si no está disponible
          if (unreadCount === 0) {
            fetchUnreadCount()
          }
          return
        }
        
        // ✅ Si feedInit completó pero no hay conversaciones después de varios intentos, hacer fetch
        if (checkAttempts >= 15 && !hasLoadedRef.current && conversations.length === 0) {
          if (checkInterval) {
            clearInterval(checkInterval)
          }
          hasLoadedRef.current = true
          lastUserIdRef.current = user.id
          Promise.all([
            fetchConversations(),
            fetchUnreadCount()
          ])
          return
        }
      }
      
      // ✅ Si ya hay conversaciones cargadas (desde feedInit), no hacer fetch
      if (conversations.length > 0 && !hasLoadedRef.current) {
        console.log('[useChat] Ya hay conversaciones cargadas desde feedInit, omitiendo fetch')
        if (checkInterval) {
          clearInterval(checkInterval)
        }
        hasLoadedRef.current = true
        lastUserIdRef.current = user.id
        // Solo hacer fetch de unreadCount si no está disponible
        if (unreadCount === 0) {
          fetchUnreadCount()
        }
        return
      }

      // ✅ Si después de varios intentos todavía no hay datos, hacer fetch como fallback
      if (checkAttempts >= maxAttempts || (!hasLoadedRef.current && conversations.length === 0 && checkAttempts >= 15)) {
        if (checkInterval) {
          clearInterval(checkInterval)
        }
        
        // ✅ Solo hacer fetch si todavía no hay datos después de esperar
        if (!hasLoadedRef.current && conversations.length === 0) {
          let mounted = true
          
          const loadData = async () => {
            if (mounted && user?.id && !hasLoadedRef.current) {
              hasLoadedRef.current = true
              lastUserIdRef.current = user.id
              // ✅ Ejecutar en paralelo para mejor performance
              await Promise.all([
                fetchConversations(),
                fetchUnreadCount()
              ])
            }
          }
          
          loadData()
          
          return () => {
            mounted = false
          }
        }
      }
    }, 200) // ✅ Verificar cada 200ms
    
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval)
      }
      // ✅ Remover listener de evento
      if (typeof window !== 'undefined') {
        window.removeEventListener('feedInit_complete', handleFeedInitComplete as EventListener)
      }
    }
    
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval)
      }
      // Resetear guard si el usuario cambia
      if (lastUserIdRef.current !== user?.id) {
        hasLoadedRef.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, conversations.length, unreadCount]) // ✅ Agregar dependencias para detectar cuando feedInit carga

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

