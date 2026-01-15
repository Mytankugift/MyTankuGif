'use client'

import { io, Socket } from 'socket.io-client'
import { getAuthToken } from '@/lib/stores/auth-store'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function initSocket(token?: string): Socket | null {
  // Si ya existe un socket conectado, retornarlo
  if (socket && socket.connected) {
    return socket
  }
  
  // Si existe pero no está conectado, desconectarlo primero
  if (socket) {
    socket.disconnect()
    socket = null
  }
  
  try {
    // ✅ Usar función centralizada (convierte null a undefined)
    const authToken = token ?? getAuthToken()
    
    if (!authToken) {
      console.warn('⚠️ [SOCKET] No hay token, no se puede inicializar socket')
      return null
    }

    console.log('🔌 [SOCKET] Inicializando socket...')
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: {
        token: authToken,
      },
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    return socket
  } catch (error) {
    console.error('❌ [SOCKET] Error inicializando socket:', error)
    return null
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}


