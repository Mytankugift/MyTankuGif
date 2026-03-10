'use client'

/**
 * Servicio centralizado de Chat en Tiempo Real
 * 
 * Características:
 * - Gestión única de conexión Socket.IO (singleton)
 * - Estado persistente de mensajes y conversaciones
 * - Reconexión automática con re-suscripción
 * - Queue de mensajes pendientes durante desconexión
 * - Sincronización bidireccional (Socket + API fallback)
 * - Sistema de eventos para notificar cambios
 * - Optimistic updates con reemplazo por ACK
 */

import { io, Socket } from 'socket.io-client'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string | null
  senderAlias?: string | null
  deletedSenderEmail?: string | null
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
  } | null
}

export interface PendingMessage {
  conversationId: string
  content: string
  type: 'TEXT' | 'IMAGE' | 'FILE'
  tempId: string
  timestamp: number
  retries: number
}

type ChatEventType = 
  | 'connected'
  | 'disconnected'
  | 'message:new'
  | 'message:sent'
  | 'message:error'
  | 'typing:start'
  | 'typing:stop'
  | 'read:update'
  | 'conversation:joined'
  | 'conversation:left'
  | 'notification' // ✅ Eventos de notificaciones
  | 'notification_count' // ✅ Contador de notificaciones

type ChatEventListener = (data: any) => void

class ChatService {
  private socket: Socket | null = null
  private isConnected: boolean = false
  private userId: string | null = null
  
  // Estado persistente
  private messages: Map<string, ChatMessage[]> = new Map()
  private activeConversations: Set<string> = new Set()
  private typingUsers: Map<string, Set<string>> = new Map()
  private pendingMessages: PendingMessage[] = []
  private lastReceivedMessage: ChatMessage | null = null // ✅ Para compatibilidad con useChat
  
  // Sistema de eventos
  private eventListeners: Map<ChatEventType, Set<ChatEventListener>> = new Map()
  
  // Refs para gestión
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = Infinity
  private heartbeatInterval: NodeJS.Timeout | null = null
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map()

  // ✅ Flag para prevenir múltiples inicializaciones simultáneas
  private isInitializing: boolean = false

  /**
   * Inicializar servicio de chat
   */
  initialize(userId: string, token: string): void {
    // ✅ Si ya está conectado con el mismo usuario, no hacer nada
    if (this.socket?.connected && this.userId === userId) {
      console.log('✅ [CHAT-SERVICE] Ya inicializado y conectado, omitiendo')
      return
    }

    // ✅ Si está en proceso de inicialización, no hacer nada
    if (this.isInitializing) {
      console.log('✅ [CHAT-SERVICE] Inicialización ya en proceso, omitiendo')
      return
    }

    // ✅ Si está en proceso de conexión con el mismo usuario, no hacer nada
    if (this.socket && this.userId === userId && !this.socket.disconnected) {
      console.log('✅ [CHAT-SERVICE] Conexión ya en proceso, omitiendo')
      return
    }

    // ✅ Marcar como inicializando
    this.isInitializing = true

    // ✅ Si hay socket existente pero es de otro usuario o está desconectado, limpiarlo
    if (this.socket) {
      console.log('🧹 [CHAT-SERVICE] Limpiando conexión anterior')
      this.disconnect()
    }

    this.userId = userId

    console.log('🔌 [CHAT-SERVICE] Inicializando nueva conexión...')
    
    // ✅ Usar forceNew: true para asegurar una conexión limpia
    this.socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      forceNew: true, // ✅ Forzar nueva conexión para evitar duplicados
    })

    this.setupSocketHandlers()
  }

  /**
   * Configurar handlers del socket
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return

    // Conexión
    this.socket.on('connect', () => {
      console.log('✅ [CHAT-SERVICE] Conectado')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.isInitializing = false // ✅ Marcar como inicializado
      this.emit('connected', {})
      
      // Re-suscribirse a conversaciones activas
      this.resubscribeToConversations()
      
      // Enviar mensajes pendientes
      this.flushPendingMessages()
      
      // Iniciar heartbeat
      this.startHeartbeat()
    })

    // Error de conexión
    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ [CHAT-SERVICE] Error de conexión:', error.message)
      this.isInitializing = false // ✅ Resetear flag al error
    })

    // Desconexión
    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ [CHAT-SERVICE] Desconectado:', reason)
      this.isInitializing = false // ✅ Resetear flag al desconectar
      this.isConnected = false
      this.emit('disconnected', { reason })
      this.stopHeartbeat()
    })

    // Error de conexión
    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ [CHAT-SERVICE] Error de conexión:', error.message)
      this.reconnectAttempts++
    })

    // Eventos de chat
    this.socket.on('chat:joined', (data: { conversationId: string }) => {
      console.log('✅ [CHAT-SERVICE] Unido a conversación:', data.conversationId)
      this.activeConversations.add(data.conversationId)
      this.emit('conversation:joined', data)
    })

    this.socket.on('chat:conversations:synced', (data: { conversationIds: string[] }) => {
      console.log('🔄 [CHAT-SERVICE] Conversaciones sincronizadas:', data.conversationIds.length)
      // Actualizar conversaciones activas
      data.conversationIds.forEach(id => {
        this.activeConversations.add(id)
      })
    })

    this.socket.on('chat:new', (message: ChatMessage) => {
      this.handleNewMessage(message)
    })

    this.socket.on('chat:sent', (data: { tempId?: string; message: ChatMessage }) => {
      this.handleMessageSent(data)
    })

    this.socket.on('chat:error', (data: { tempId?: string; conversationId: string; error: string }) => {
      this.handleMessageError(data)
    })

    this.socket.on('chat:typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      this.handleTyping(data)
    })

    this.socket.on('chat:read', (data: { conversationId: string; readBy: string }) => {
      this.handleReadUpdate(data)
    })

    // ✅ Eventos genéricos (notificaciones, presencia, etc.)
    this.socket.on('event', (event: { type: string; payload?: any; timestamp?: string }) => {
      if (!event || !event.type) return

      // ✅ Manejar notificaciones
      if (event.type === 'notification') {
        const notification = event.payload?.notification
        if (notification) {
          console.log('📬 [CHAT-SERVICE] Notificación recibida:', notification.id)
          this.emit('notification', { notification })
        }
      } else if (event.type === 'notification_count') {
        const unreadCount = event.payload?.unreadCount
        if (typeof unreadCount === 'number') {
          console.log('🔔 [CHAT-SERVICE] Contador de notificaciones actualizado:', unreadCount)
          this.emit('notification_count', { unreadCount })
        }
      } else if (event.type === 'presence') {
        // Presencia de usuarios (opcional, para futuras features)
        this.emit('presence', event.payload)
      }
    })
  }

  /**
   * Re-suscribirse a conversaciones activas después de reconexión
   */
  private resubscribeToConversations(): void {
    if (!this.socket || !this.isConnected) return

    const conversations = Array.from(this.activeConversations)
    console.log(`🔄 [CHAT-SERVICE] Re-suscribiendo a ${conversations.length} conversaciones`)
    
    conversations.forEach(conversationId => {
      if (!conversationId.startsWith('temp-')) {
        this.socket!.emit('chat:join', conversationId)
      }
    })
  }

  /**
   * Enviar mensajes pendientes después de reconexión
   */
  private flushPendingMessages(): void {
    if (!this.socket || !this.isConnected || this.pendingMessages.length === 0) return

    console.log(`📤 [CHAT-SERVICE] Enviando ${this.pendingMessages.length} mensajes pendientes`)
    
    const messagesToSend = [...this.pendingMessages]
    this.pendingMessages = []

    messagesToSend.forEach(pending => {
      this.sendMessageInternal(
        pending.conversationId,
        pending.content,
        pending.type,
        pending.tempId
      )
    })
  }

  /**
   * Iniciar heartbeat para mantener conexión activa
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping')
      }
    }, 30000) // Cada 30 segundos
  }

  /**
   * Detener heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Unirse a una conversación
   */
  joinConversation(conversationId: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ [CHAT-SERVICE] No conectado, no se puede unir a conversación')
      return
    }

    if (this.activeConversations.has(conversationId)) {
      console.log('ℹ️ [CHAT-SERVICE] Ya está unido a la conversación:', conversationId)
      return
    }

    this.socket.emit('chat:join', conversationId)
    this.activeConversations.add(conversationId)
  }

  /**
   * Salir de una conversación
   */
  leaveConversation(conversationId: string): void {
    if (!this.socket || !this.isConnected) return

    this.socket.emit('chat:leave', conversationId)
    this.activeConversations.delete(conversationId)
    this.typingUsers.delete(conversationId)
    this.emit('conversation:left', { conversationId })
  }

  /**
   * Enviar mensaje
   */
  sendMessage(conversationId: string, content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT'): string | null {
    if (!content || content.trim().length === 0) {
      console.warn('⚠️ [CHAT-SERVICE] Mensaje vacío')
      return null
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ [CHAT-SERVICE] No conectado, agregando a queue')
      this.pendingMessages.push({
        conversationId,
        content: content.trim(),
        type,
        tempId,
        timestamp: Date.now(),
        retries: 0,
      })
      return tempId
    }

    return this.sendMessageInternal(conversationId, content.trim(), type, tempId)
  }

  /**
   * Enviar mensaje interno (con socket conectado)
   */
  private sendMessageInternal(
    conversationId: string,
    content: string,
    type: 'TEXT' | 'IMAGE' | 'FILE',
    tempId: string
  ): string {
    if (!this.socket || !this.userId) return tempId

    // ✅ NUEVO: Agregar mensaje optimista inmediatamente
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversationId,
      senderId: this.userId,
      content,
      type,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      sender: null, // Se completará cuando llegue el ACK
    }

    const conversationMessages = this.messages.get(conversationId) || []
    // ✅ Agregar mensaje optimista al final
    conversationMessages.push(optimisticMessage)
    // Ordenar por fecha
    conversationMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    this.messages.set(conversationId, conversationMessages)

    // ✅ Emitir evento optimista para que los componentes vean el mensaje inmediatamente
    // El ACK del servidor lo reemplazará después
    this.emit('message:optimistic', { message: optimisticMessage, tempId })

    this.socket.emit('chat:send', {
      conversationId,
      content,
      type,
      tempId,
    }, (response: { success: boolean; messageId?: string; error?: string }) => {
      if (!response.success) {
        console.error('❌ [CHAT-SERVICE] Error enviando mensaje:', response.error)
        // Remover mensaje optimista si falla
        const currentMessages = this.messages.get(conversationId) || []
        const filtered = currentMessages.filter(m => m.id !== tempId)
        this.messages.set(conversationId, filtered)
        // Re-agregar a queue si falla
        this.pendingMessages.push({
          conversationId,
          content,
          type,
          tempId,
          timestamp: Date.now(),
          retries: 0,
        })
      }
    })

    return tempId
  }

  /**
   * Manejar nuevo mensaje recibido
   */
  private handleNewMessage(message: ChatMessage): void {
    const conversationId = message.conversationId
    const conversationMessages = this.messages.get(conversationId) || []

    // ✅ Evitar duplicados (verificar por ID, no por senderId)
    if (conversationMessages.find(m => m.id === message.id)) {
      return
    }

    // ✅ Si es nuestro mensaje, verificar si ya existe (puede venir de chat:new después de chat:sent)
    if (message.senderId === this.userId) {
      // Si ya existe el mensaje (fue agregado por ACK), no agregarlo de nuevo
      const existing = conversationMessages.find(m => 
        m.id === message.id || 
        (m.id.startsWith('temp-') && m.content === message.content && Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000)
      )
      if (existing && !existing.id.startsWith('temp-')) {
        // Ya existe el mensaje real, no agregar duplicado
        return
      }
    }

    conversationMessages.push(message)
    // Ordenar por fecha
    conversationMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    this.messages.set(conversationId, conversationMessages)
    
    // ✅ Actualizar último mensaje recibido solo si NO es nuestro mensaje (para evitar loops)
    if (message.senderId !== this.userId) {
      this.lastReceivedMessage = message
    }

    console.log('📨 [CHAT-SERVICE] Mensaje nuevo:', {
      conversationId,
      senderId: message.senderId,
      content: message.content.substring(0, 50),
    })

    this.emit('message:new', { message })
  }

  /**
   * Manejar ACK de mensaje enviado
   */
  private handleMessageSent(data: { tempId?: string; message: ChatMessage }): void {
    const { tempId, message } = data
    const conversationId = message.conversationId
    const conversationMessages = this.messages.get(conversationId) || []

    // ✅ NUEVO: Preservar todos los mensajes existentes, solo reemplazar el optimista
    if (tempId) {
      // Filtrar el mensaje optimista (tempId) y agregar el mensaje real
      const filtered = conversationMessages.filter(m => m.id !== tempId && m.id !== message.id)
      
      // Agregar el mensaje real
      filtered.push(message)
      // Ordenar por fecha para mantener orden correcto
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      
      this.messages.set(conversationId, filtered)
    } else {
      // Si no hay tempId, verificar si existe
      const existingIndex = conversationMessages.findIndex(m => m.id === message.id)
      if (existingIndex === -1) {
        conversationMessages.push(message)
        // Ordenar por fecha
        conversationMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        this.messages.set(conversationId, conversationMessages)
      } else {
        // Actualizar el existente (preservar todos los demás)
        conversationMessages[existingIndex] = message
        this.messages.set(conversationId, conversationMessages)
      }
    }

    this.emit('message:sent', { message, tempId })
  }

  /**
   * Manejar error al enviar mensaje
   */
  private handleMessageError(data: { tempId?: string; conversationId: string; error: string }): void {
    const { tempId, conversationId } = data

    // Remover mensaje optimista si existe
    if (tempId) {
      const conversationMessages = this.messages.get(conversationId) || []
      const filtered = conversationMessages.filter(m => m.id !== tempId)
      this.messages.set(conversationId, filtered)
    }

    this.emit('message:error', data)
  }

  /**
   * Manejar indicador de typing
   */
  private handleTyping(data: { conversationId: string; userId: string; isTyping: boolean }): void {
    const { conversationId, userId, isTyping } = data

    if (userId === this.userId) return

    let users = this.typingUsers.get(conversationId) || new Set()

    if (isTyping) {
      users.add(userId)
      this.emit('typing:start', { conversationId, userId })
      
      // Limpiar después de 3 segundos
      const timeoutId = setTimeout(() => {
        users.delete(userId)
        this.typingUsers.set(conversationId, users)
        this.emit('typing:stop', { conversationId, userId })
      }, 3000)

      // Limpiar timeout anterior
      const existingTimeout = this.typingTimeouts.get(`${conversationId}-${userId}`)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }
      this.typingTimeouts.set(`${conversationId}-${userId}`, timeoutId)
    } else {
      users.delete(userId)
      this.emit('typing:stop', { conversationId, userId })
    }

    this.typingUsers.set(conversationId, users)
  }

  /**
   * Manejar actualización de lectura
   */
  private handleReadUpdate(data: { conversationId: string; readBy: string }): void {
    const { conversationId } = data
    const conversationMessages = this.messages.get(conversationId) || []

    const updated = conversationMessages.map(msg => {
      if (msg.senderId !== this.userId && msg.status !== 'READ') {
        return { ...msg, status: 'READ' as const }
      }
      return msg
    })

    this.messages.set(conversationId, updated)
    this.emit('read:update', data)
  }

  /**
   * Enviar indicador de typing
   */
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (!this.socket || !this.isConnected) return

    this.socket.emit('chat:typing', {
      conversationId,
      isTyping,
    })
  }

  /**
   * Marcar mensajes como leídos
   */
  markAsRead(conversationId: string): void {
    if (!this.socket || !this.isConnected) return

    // Actualizar optimistamente
    const conversationMessages = this.messages.get(conversationId) || []
    const updated = conversationMessages.map(msg => {
      if (msg.senderId !== this.userId && msg.status !== 'READ') {
        return { ...msg, status: 'READ' as const }
      }
      return msg
    })
    this.messages.set(conversationId, updated)

    this.socket.emit('chat:read', { conversationId })
  }

  /**
   * Cargar mensajes históricos desde API
   */
  async loadMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const response = await apiClient.get<ChatMessage[]>(
        `${API_ENDPOINTS.CHAT.MESSAGES(conversationId)}?page=${page}&limit=${limit}`
      )

      if (response.success && response.data) {
        const existingMessages = this.messages.get(conversationId) || []
        
        if (page === 1) {
          // ✅ Primera página: merge inteligente preservando mensajes del socket
          const existingIds = new Set(existingMessages.map(m => m.id))
          const newMessages = response.data.filter(m => !existingIds.has(m.id))
          
          // ✅ Combinar: mensajes de API (historial) + mensajes existentes del socket (tiempo real)
          // Los mensajes del socket tienen prioridad si hay duplicados
          const combinedMap = new Map<string, ChatMessage>()
          
          // Primero agregar mensajes de API (historial)
          response.data.forEach(msg => {
            combinedMap.set(msg.id, msg)
          })
          
          // Luego agregar mensajes del socket (sobrescriben si hay duplicados)
          existingMessages.forEach(msg => {
            // Solo agregar si no es un mensaje optimista o si no existe ya
            if (!msg.id.startsWith('temp-') || !combinedMap.has(msg.id)) {
              combinedMap.set(msg.id, msg)
            }
          })
          
          // Convertir a array y ordenar por fecha
          const combined = Array.from(combinedMap.values()).sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          
          this.messages.set(conversationId, combined)
        } else {
          // Páginas siguientes: agregar al inicio (mensajes más antiguos)
          const existingIds = new Set(existingMessages.map(m => m.id))
          const newMessages = response.data.filter(m => !existingIds.has(m.id))
          
          // Combinar: nuevos mensajes (más antiguos) + mensajes existentes (más recientes)
          const combined = [...newMessages, ...existingMessages]
          this.messages.set(conversationId, combined)
        }

        return response.data
      }
    } catch (error) {
      console.error('❌ [CHAT-SERVICE] Error cargando mensajes:', error)
    }

    return []
  }

  /**
   * Obtener mensajes de una conversación
   */
  getMessages(conversationId: string): ChatMessage[] {
    return this.messages.get(conversationId) || []
  }

  /**
   * Obtener usuarios escribiendo
   */
  getTypingUsers(conversationId: string): string[] {
    return Array.from(this.typingUsers.get(conversationId) || [])
  }

  /**
   * Suscribirse a eventos
   */
  on(event: ChatEventType, listener: ChatEventListener): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)

    // Retornar función de cleanup
    return () => {
      this.eventListeners.get(event)?.delete(listener)
    }
  }

  /**
   * Emitir evento
   */
  private emit(event: ChatEventType, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`❌ [CHAT-SERVICE] Error en listener de ${event}:`, error)
        }
      })
    }
  }

  /**
   * Obtener estado de conexión
   */
  getConnectionState(): { isConnected: boolean; activeConversations: number; pendingMessages: number; conversationIds: string[] } {
    return {
      isConnected: this.isConnected,
      activeConversations: this.activeConversations.size,
      pendingMessages: this.pendingMessages.length,
      conversationIds: Array.from(this.activeConversations),
    }
  }

  /**
   * Obtener último mensaje recibido (para compatibilidad con useChat)
   */
  getLastReceivedMessage(): ChatMessage | null {
    return this.lastReceivedMessage
  }

  /**
   * Obtener todos los mensajes como Map (para compatibilidad con useChat)
   */
  getAllMessages(): Map<string, ChatMessage[]> {
    return new Map(this.messages)
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    this.stopHeartbeat()
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.isConnected = false
    this.activeConversations.clear()
    this.typingUsers.clear()
    this.pendingMessages = []
  }

  /**
   * Limpiar todo
   */
  cleanup(): void {
    this.disconnect()
    this.messages.clear()
    this.eventListeners.clear()
    this.userId = null
  }
}

// Singleton
export const chatService = new ChatService()

