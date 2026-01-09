'use client'

import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/lib/stores/auth-store'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function initSocket(): Socket | null {
  if (socket) return socket
  try {
    const { getState } = useAuthStore
    const { token } = getState()
    if (!token) return null

    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: {
        token: token,
      },
      withCredentials: true,
    })

    return socket
  } catch {
    return null
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}


