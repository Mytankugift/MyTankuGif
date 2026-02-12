'use client'

import { useState, useEffect, useRef } from 'react'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { NotificationItem } from '@/components/notifications/notification-item'

type FilterType = 'all' | 'unread'

export default function NotificationsPage() {
  // ✅ Filtro por defecto: No leídas (las más importantes)
  const [filter, setFilter] = useState<FilterType>('unread')
  const [limit] = useState(20)
  const filterRef = useRef(filter)
  
  // ✅ Actualizar ref cuando cambia filter
  useEffect(() => {
    filterRef.current = filter
  }, [filter])
  
  const {
    items,
    isLoading,
    hasMore,
    unreadCount,
    totalCount,
    fetchList,
    loadMore,
    markAllAsRead,
    markAsRead,
  } = useNotifications({
    limit,
    isRead: filter === 'unread' ? false : undefined,
    autoFetch: false, // Controlamos manualmente
    ignoreOptionsIsRead: true, // ✅ Siempre usar el isRead explícito de fetchList
  })

  // ✅ Cargar inicialmente y cuando cambia el filtro
  useEffect(() => {
    const loadNotifications = async () => {
      const currentFilter = filterRef.current
      await fetchList({ 
        limit, 
        offset: 0, 
        isRead: currentFilter === 'unread' ? false : undefined 
      })
    }
    loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, limit]) // ✅ No incluir fetchList para evitar loops

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    if (filter === 'unread') {
      // Si estamos viendo solo no leídas, recargar
      await fetchList({ limit, offset: 0, isRead: false })
    }
  }

  return (
    <div
      className="w-full overflow-x-hidden flex flex-col"
      style={{ backgroundColor: '#1E1E1E', minHeight: '100vh' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-4 border-b"
        style={{
          backgroundColor: '#1E1E1E',
          borderColor: '#73FFA2/20',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold" style={{ color: '#73FFA2' }}>
              Notificaciones
            </h1>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm px-3 py-1 rounded-lg transition-colors hover:opacity-80"
                style={{
                  backgroundColor: '#73FFA2',
                  color: '#2C3137',
                }}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#73FFA2] text-[#2C3137]'
                  : 'bg-transparent text-gray-400 border border-gray-700 hover:border-[#73FFA2]/50'
              }`}
            >
              Todas {totalCount > 0 && `(${totalCount})`}
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                filter === 'unread'
                  ? 'bg-[#73FFA2] text-[#2C3137]'
                  : 'bg-transparent text-gray-400 border border-gray-700 hover:border-[#73FFA2]/50'
              }`}
            >
              No leídas
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center"
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="flex-1 px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {isLoading && items.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-400">Cargando notificaciones...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">🔔</div>
              <div className="text-gray-400 text-center">
                {filter === 'unread' 
                  ? 'No tienes notificaciones no leídas' 
                  : 'No tienes notificaciones'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))}
              
              {/* Botón de cargar más */}
              {hasMore && (
                <div className="py-4 text-center">
                  {isLoading ? (
                    <div className="text-gray-400">Cargando más...</div>
                  ) : (
                    <button
                      onClick={loadMore}
                      className="text-sm px-4 py-2 rounded-lg transition-colors hover:opacity-80"
                      style={{
                        backgroundColor: '#73FFA2',
                        color: '#2C3137',
                      }}
                    >
                      Cargar más
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

