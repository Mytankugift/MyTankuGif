'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { chatService } from '@/lib/services/chat.service'
import { useFeedInitContext } from '@/lib/context/feed-init-context'

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
  initialData?: { // ✅ Datos iniciales desde feedInit para evitar fetch duplicado
    items?: NotificationItem[]
    unreadCount?: number
  }
}) {
  const { isAuthenticated, token } = useAuthStore()
  const { isComplete, hasData } = useFeedInitContext()
  const [unreadCount, setUnreadCount] = useState<number>(options?.initialData?.unreadCount ?? 0)
  const [items, setItems] = useState<NotificationItem[]>(options?.initialData?.items ?? [])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [lastIsReadFilter, setLastIsReadFilter] = useState<boolean | undefined>(options?.isRead)
  const hasInitialData = useRef(!!options?.initialData) // ✅ Guard para evitar fetch si ya hay datos iniciales

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
    
    // Si ya tenemos datos iniciales, no hacer fetch (evitar duplicados)
    if (hasInitialData.current && options?.initialData) {
      if (options.initialData.unreadCount !== undefined) {
        setUnreadCount(options.initialData.unreadCount)
      }
      if (options.initialData.items && options.initialData.items.length > 0) {
        setItems(options.initialData.items)
      }
      return
    }
    
    if (!isComplete) {
      if (hasData.notifications && (items.length > 0 || unreadCount > 0)) {
        return
      }
      return
    }

    if (hasData.notifications && (items.length > 0 || unreadCount > 0)) {
      return
    }

    if (isComplete && !hasData.notifications && items.length === 0 && unreadCount === 0 && !hasInitialData.current) {
      fetchUnreadCount()
      if (options?.autoFetch !== false) {
        fetchList()
      }
    }
  }, [
    isAuthenticated,
    isComplete,
    hasData.notifications,
    items.length,
    unreadCount,
    fetchUnreadCount,
    fetchList,
    options?.autoFetch,
    options?.initialData,
  ])

  // Suscripción socket siempre activa (independiente de feedInit / datos iniciales)
  useEffect(() => {
    if (!isAuthenticated) return

    const unsubscribeNotification = chatService.on('notification', (data: { notification: NotificationItem }) => {
      const notification = data.notification
      if (!notification) return

      setItems((prev) => {
        const maxItems = options?.limit ?? 10
        const matchesFilter = options?.isRead === undefined || notification.isRead === options.isRead
        const without = prev.filter((n) => n.id !== notification.id)
        if (!matchesFilter) {
          return without
        }
        return [notification, ...without].slice(0, maxItems)
      })

      setTimeout(() => {
        fetchUnreadCount()
      }, 100)
    })

    const unsubscribeNotificationDeleted = chatService.on('notification_deleted', (data: { id: string }) => {
      const id = data?.id
      if (!id) return

      setItems((prev) => {
        const removed = prev.find((n) => n.id === id)
        if (removed && !removed.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1))
        }
        return prev.filter((n) => n.id !== id)
      })

      setTimeout(() => {
        fetchUnreadCount()
      }, 100)
    })

    const unsubscribeNotificationCount = chatService.on('notification_count', (data: { unreadCount: number }) => {
      const count = data.unreadCount
      if (typeof count === 'number') {
        setUnreadCount(count)
      }
    })

    return () => {
      unsubscribeNotification()
      unsubscribeNotificationCount()
      unsubscribeNotificationDeleted()
    }
  }, [isAuthenticated, fetchUnreadCount, options?.limit, options?.isRead])

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


