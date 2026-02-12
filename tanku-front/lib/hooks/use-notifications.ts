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

export function useNotifications(options?: { 
  limit?: number
  offset?: number
  isRead?: boolean
  autoFetch?: boolean
  ignoreOptionsIsRead?: boolean // ✅ Flag para ignorar isRead de options
}) {
  const { isAuthenticated, token } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [lastIsReadFilter, setLastIsReadFilter] = useState<boolean | undefined>(options?.isRead)

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const res = await apiClient.get<{ unreadCount: number; totalCount: number }>(
        API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT
      )
      if (res.success && res.data) {
        setUnreadCount(res.data.unreadCount || 0)
        setTotalCount(res.data.totalCount || 0)
      }
    } catch {
      // ignore
    }
  }, [isAuthenticated])

  const fetchList = useCallback(async (params?: { limit?: number; offset?: number; isRead?: boolean }) => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const limit = params?.limit ?? options?.limit ?? 50
      const offset = params?.offset ?? options?.offset ?? 0
      // ✅ Si ignoreOptionsIsRead es true o params tiene isRead explícitamente, usar params
      // Si no, usar el de options
      const isRead = (options?.ignoreOptionsIsRead || (params && 'isRead' in params)) 
        ? params?.isRead 
        : options?.isRead
      
      // ✅ Guardar el último filtro usado para loadMore
      if (offset === 0) {
        setLastIsReadFilter(isRead)
      }
      
      const queryParams = new URLSearchParams()
      if (limit) queryParams.set('limit', limit.toString())
      if (offset) queryParams.set('offset', offset.toString())
      if (isRead !== undefined) queryParams.set('isRead', isRead.toString())
      
      const url = `${API_ENDPOINTS.NOTIFICATIONS.LIST}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const res = await apiClient.get<NotificationItem[]>(url)
      
      if (res.success && Array.isArray(res.data)) {
        if (offset === 0) {
          // Primera carga o recarga
          setItems(res.data)
        } else {
          // Cargar más (append)
          setItems(prev => [...prev, ...res.data])
        }
        setHasMore(res.data.length === limit)
      }
    } catch (error) {
      // Log error pero no romper la UI
      console.error('[useNotifications] Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, options?.limit])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    const currentLimit = options?.limit ?? 50
    // ✅ Usar el último filtro isRead que se usó (guardado en lastIsReadFilter)
    await fetchList({ 
      limit: currentLimit, 
      offset: items.length,
      isRead: lastIsReadFilter
    })
  }, [isLoading, hasMore, items.length, fetchList, options?.limit, lastIsReadFilter])

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {})
      setUnreadCount(0)
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      // ignore
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId), {})
      setItems((prev) => prev.map((n) => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    
    fetchUnreadCount()
    if (options?.autoFetch !== false) {
      fetchList()
    }

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
          // ✅ Solo actualizar estado local, NO recargar desde servidor
          setItems((prev) => {
            // Evitar duplicados
            if (prev.some((n) => n.id === notification.id)) {
              return prev
            }
            // Si estamos en modo dropdown (sin opciones), limitar a 10
            const maxItems = options?.limit ?? 10
            // ✅ Solo agregar si no hay filtro de isRead o si la notificación coincide
            if (options?.isRead === undefined || notification.isRead === options.isRead) {
              return [notification, ...prev].slice(0, maxItems)
            }
            return prev
          })
          // Incrementar contador solo si es no leída
          if (!notification.isRead) {
            setUnreadCount((c) => c + 1)
          }
          
          // ✅ Solo actualizar contador, NO recargar lista completa
          setTimeout(() => {
            fetchUnreadCount()
          }, 100) // Pequeño delay para evitar múltiples llamadas
        }
      } else if (msg.type === 'notification_count') {
        const count = msg.payload?.unreadCount
        if (typeof count === 'number') {
          setUnreadCount(count)
        }
        // ✅ NO recargar lista cuando solo cambia el contador
      }
    }

    socket.on('event', onEvent)
    return () => {
      const s = getSocket()
      s?.off('event', onEvent)
    }
  }, [isAuthenticated, fetchUnreadCount, options?.autoFetch, options?.limit, options?.isRead, token])

  return {
    unreadCount,
    items,
    isOpen,
    isLoading,
    hasMore,
    totalCount,
    setIsOpen,
    fetchList,
    loadMore,
    markAllAsRead,
    markAsRead,
  }
}


