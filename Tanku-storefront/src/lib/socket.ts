"use client"

import { io, Socket } from "socket.io-client"

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name?: string
  content: string
  message_type: string
  created_at: string
  is_edited: boolean
  is_deleted: boolean
}

export interface UserStatus {
  user_id: string
  is_online: boolean
  last_seen: string | null
}

class SocketManager {
  private socket: Socket | null = null
  private customerId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  // Event listeners
  private messageListeners: ((message: ChatMessage) => void)[] = []
  private userStatusListeners: ((status: UserStatus) => void)[] = []
  private connectionListeners: ((connected: boolean) => void)[] = []
  private typingListeners: ((data: { user_id: string; conversation_id: string; is_typing: boolean }) => void)[] = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSocket()
    }
  }

  private initializeSocket() {
    const socketUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
    
    this.socket = io(socketUrl, {
      transports: ['polling'], // Solo polling para evitar errores de WebSocket
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 30000, // 30 segundos de timeout
      forceNew: true, // Forzar nueva conexión
      upgrade: false, // No intentar upgrade a WebSocket
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('[SOCKET] Connected to server')
      this.reconnectAttempts = 0
      this.notifyConnectionListeners(true)
      
      // Re-authenticate if we have a customer ID
      if (this.customerId) {
        this.authenticate(this.customerId)
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason)
      this.notifyConnectionListeners(false)
    })

    this.socket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error)
      
      // Si es un error de websocket, intentar con polling
      if (error.message?.includes('websocket') || (error as any).type === 'TransportError') {
        console.log('[SOCKET] WebSocket failed, trying with polling only')
        if (this.socket) {
          this.socket.io.opts.transports = ['polling']
        }
      }
      
      this.handleReconnection()
    })

    this.socket.on('error', (error) => {
      console.error('[SOCKET] Socket error:', error)
      
      // Manejar errores específicos
      if (error.message?.includes('websocket')) {
        console.log('[SOCKET] WebSocket error detected, falling back to polling')
        if (this.socket) {
          this.socket.io.opts.transports = ['polling']
        }
      }
    })

    this.socket.on('authenticated', (data) => {
      console.log('[SOCKET] Authenticated successfully:', data)
    })

    this.socket.on('new-message', (data) => {
      console.log('[SOCKET] New message received:', data)
      this.notifyMessageListeners(data.message)
    })

    this.socket.on('user-status-changed', (data) => {
      console.log('[SOCKET] User status changed:', data)
      this.notifyUserStatusListeners({
        user_id: data.user_id,
        is_online: data.status === 'online',
        last_seen: data.timestamp
      })
    })

    this.socket.on('user-typing', (data) => {
      console.log('[SOCKET] User typing:', data)
      this.notifyTypingListeners(data)
    })

    this.socket.on('conversation-updated', (data) => {
      console.log('[SOCKET] Conversation updated:', data)
    })
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      
      console.log(`[SOCKET] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)
      
      setTimeout(() => {
        // Verificar si el servidor está disponible antes de reconectar
        this.checkServerStatus().then((isAvailable) => {
          if (isAvailable) {
            this.connect()
          } else {
            console.warn('[SOCKET] Server not available, will retry later')
            this.handleReconnection()
          }
        })
      }, delay)
    } else {
      console.error('[SOCKET] Max reconnection attempts reached')
      console.info('[SOCKET] You can manually initialize Socket.IO by calling: curl -X POST http://localhost:9000/socket/initialize')
    }
  }

  private async checkServerStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'}/socket/status`)
      const data = await response.json()
      return data.success && data.data.socketServerInitialized
    } catch (error) {
      return false
    }
  }

  // Public methods
  connect() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect()
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }

  authenticate(customerId: string) {
    this.customerId = customerId
    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', { customerId })
    } else {
      // Connect first, then authenticate
      this.connect()
    }
  }

  joinConversation(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-conversation', { conversationId })
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-conversation', { conversationId })
    }
  }

  startTyping(conversationId: string) {
    if (this.socket && this.socket.connected && this.customerId) {
      this.socket.emit('typing-start', { 
        conversationId, 
        userId: this.customerId 
      })
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket && this.socket.connected && this.customerId) {
      this.socket.emit('typing-stop', { 
        conversationId, 
        userId: this.customerId 
      })
    }
  }

  // Event listener management
  onMessage(callback: (message: ChatMessage) => void) {
    this.messageListeners.push(callback)
    return () => {
      this.messageListeners = this.messageListeners.filter(cb => cb !== callback)
    }
  }

  onUserStatus(callback: (status: UserStatus) => void) {
    this.userStatusListeners.push(callback)
    return () => {
      this.userStatusListeners = this.userStatusListeners.filter(cb => cb !== callback)
    }
  }

  onConnection(callback: (connected: boolean) => void) {
    this.connectionListeners.push(callback)
    return () => {
      this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback)
    }
  }

  onTyping(callback: (data: { user_id: string; conversation_id: string; is_typing: boolean }) => void) {
    this.typingListeners.push(callback)
    return () => {
      this.typingListeners = this.typingListeners.filter(cb => cb !== callback)
    }
  }

  // Private notification methods
  private notifyMessageListeners(message: ChatMessage) {
    this.messageListeners.forEach(callback => callback(message))
  }

  private notifyUserStatusListeners(status: UserStatus) {
    this.userStatusListeners.forEach(callback => callback(status))
  }

  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach(callback => callback(connected))
  }

  private notifyTypingListeners(data: { user_id: string; conversation_id: string; is_typing: boolean }) {
    this.typingListeners.forEach(callback => callback(data))
  }

  // Getters
  get isConnected() {
    return this.socket?.connected || false
  }

  get currentCustomerId() {
    return this.customerId
  }
}

// Singleton instance
export const socketManager = new SocketManager()
export default socketManager
