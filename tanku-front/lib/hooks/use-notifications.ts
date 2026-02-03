'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { initSocket, getSocket } from '@/lib/realtime/socket'
import { useAuthStore } from '@/lib/stores/auth-store'

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  data: any | null
  isRead: boolean
  createdAt: string
}

export function useNotifications() {
  const { isAuthenticated, token } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const res = await apiClient.get<{ unreadCount: number; totalCount: number }>(
        API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT
      )
      if (res.success && res.data) {
        setUnreadCount(res.data.unreadCount || 0)
      }
    } catch {
      // ignore
    }
  }, [isAuthenticated])

  const fetchList = useCallback(async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const res = await apiClient.get<NotificationItem[]>(API_ENDPOINTS.NOTIFICATIONS.LIST)
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data.slice(0, 10))
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {})
      setUnreadCount(0)
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    
    fetchUnreadCount()
    fetchList()

    // ✅ Verificar que haya token antes de inicializar socket
    if (!token) {
      console.warn('[useNotifications] No hay token, omitiendo inicialización de socket')
      return
    }

    const socket = initSocket(token)
    if (!socket) return

    const onEvent = (msg: any) => {
      if (!msg || !msg.type) return
      if (msg.type === 'notification') {
        const notification = msg.payload?.notification
        if (notification) {
          // Actualizar lista de notificaciones (rápido, síncrono)
          setItems((prev) => {
            // Evitar duplicados
            if (prev.some((n) => n.id === notification.id)) {
              return prev
            }
            return [notification, ...prev].slice(0, 10)
          })
          // Incrementar contador (rápido, síncrono)
          setUnreadCount((c) => c + 1)
          
          // ✅ Diferir las llamadas API para no bloquear el handler
          // Usar setTimeout con 0ms para ejecutar en el siguiente tick
          setTimeout(() => {
            fetchList()
            fetchUnreadCount()
          }, 0)
        }
      } else if (msg.type === 'notification_count') {
        const count = msg.payload?.unreadCount
        if (typeof count === 'number') {
          setUnreadCount(count)
        }
        // ✅ Diferir la llamada API
        setTimeout(() => {
          fetchList()
        }, 0)
      }
    }

    socket.on('event', onEvent)
    return () => {
      const s = getSocket()
      s?.off('event', onEvent)
    }
  }, [isAuthenticated, fetchUnreadCount, fetchList])

  return {
    unreadCount,
    items,
    isOpen,
    isLoading,
    setIsOpen,
    fetchList,
    markAllAsRead,
  }
}


