'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { NotificationItem } from '@/components/notifications/notification-item'
import { BaseNav } from '@/components/layout/base-nav'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { getNotificationTargetUserId } from '@/lib/notifications-display'

type FilterType = 'all' | 'unread'

/** Inner shadow tipo pills Tanku */
const BTN_INSET =
  '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset'

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterType>('unread')
  const [limit] = useState(20)
  const filterRef = useRef(filter)

  const [resolvedAvatars, setResolvedAvatars] = useState<Record<string, string>>({})
  const [resolvedUsernames, setResolvedUsernames] = useState<Record<string, string>>({})

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
    autoFetch: false,
    ignoreOptionsIsRead: true,
  })

  useEffect(() => {
    const loadNotifications = async () => {
      const currentFilter = filterRef.current
      await fetchList({
        limit,
        offset: 0,
        isRead: currentFilter === 'unread' ? false : undefined,
      })
    }
    loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, limit])

  useEffect(() => {
    if (items.length === 0) return

    const shouldResolveAvatar = (n: { type?: string; title?: string; message?: string }) => {
      const loweredType = (n.type || '').toLowerCase()
      const loweredTitle = (n.title || '').toLowerCase()
      const loweredMessage = (n.message || '').toLowerCase()
      return (
        loweredType === 'friend_request' ||
        loweredType.includes('friend_accepted') ||
        loweredType.includes('accepted') ||
        (loweredTitle.includes('solicitud') && loweredTitle.includes('acept')) ||
        (loweredMessage.includes('solicitud') && loweredMessage.includes('acept'))
      )
    }

    const userIdsToResolve = items
      .filter(shouldResolveAvatar)
      .map((n) => getNotificationTargetUserId(n))
      .filter((id): id is string => Boolean(id))
      .filter((id) => !resolvedAvatars[id] || !resolvedUsernames[id])

    if (userIdsToResolve.length === 0) return

    let cancelled = false

    Promise.all(
      userIdsToResolve.map(async (userId) => {
        try {
          const response = await apiClient.get<any>(API_ENDPOINTS.USERS.BY_ID(userId))
          const avatar = response?.data?.profile?.avatar || null
          const username = response?.data?.username || null
          return { userId, avatar, username }
        } catch {
          return { userId, avatar: null, username: null }
        }
      })
    ).then((results) => {
      if (cancelled) return
      const nextAvatars: Record<string, string> = {}
      const nextUsernames: Record<string, string> = {}
      results.forEach(({ userId, avatar, username }) => {
        if (avatar) nextAvatars[userId] = avatar
        if (username) nextUsernames[userId] = username
      })
      if (Object.keys(nextAvatars).length > 0) {
        setResolvedAvatars((prev) => ({ ...prev, ...nextAvatars }))
      }
      if (Object.keys(nextUsernames).length > 0) {
        setResolvedUsernames((prev) => ({ ...prev, ...nextUsernames }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [items, resolvedAvatars, resolvedUsernames])

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    if (filter === 'unread') {
      await fetchList({ limit, offset: 0, isRead: false })
    }
  }

  const pillActive =
    'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all md:px-4 md:py-2 md:text-sm'
  const pillInactive =
    'rounded-full border border-[#414141] bg-transparent px-3 py-1.5 text-[11px] font-semibold text-gray-400 transition-colors hover:border-[#73FFA2]/50 md:px-4 md:py-2 md:text-sm'

  return (
    <>
      <BaseNav
        showStories={false}
        pageTitle="Notificaciones"
        pageTitleColor="#FFFFFF"
        mobileTranslucentNav
        mobileBackCenterTitleCartOnly
        desktopNavTitleCentered
      />

      <div
        id="notifications-scroll-root"
        className="flex min-h-0 w-full flex-1 flex-col overflow-hidden text-white"
        style={{
          fontFamily: 'Poppins, sans-serif',
          backgroundColor: 'var(--color-surface-191e23-20)',
        }}
      >
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain max-md:px-3 max-md:pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] max-md:pt-[max(6rem,calc(env(safe-area-inset-top,0px)+5rem))] md:px-8 md:pb-8 md:pt-28 lg:px-10 lg:pt-28">
          {/* Barra superior: icono nav + título a la izquierda; filtros + marcar todas a la derecha — sin caja modal */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-3 border-b border-white/[0.08] pb-4 md:mb-6 md:items-center md:pb-5">
            <div className="flex min-w-0 flex-1 items-center gap-2 md:min-w-[200px] md:gap-3">
              <Image
                src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
                alt=""
                width={28}
                height={28}
                className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7"
                unoptimized
              />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white md:text-base">
                  Centro de notificaciones
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 md:gap-2.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`${filter === 'all' ? pillActive : pillInactive}`}
                style={
                  filter === 'all'
                    ? {
                        backgroundColor: '#73FFA2',
                        color: '#2C3137',
                        boxShadow: BTN_INSET,
                      }
                    : undefined
                }
              >
                Todas {totalCount > 0 && `(${totalCount})`}
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`relative ${filter === 'unread' ? pillActive : pillInactive}`}
                style={
                  filter === 'unread'
                    ? {
                        backgroundColor: '#73FFA2',
                        color: '#2C3137',
                        boxShadow: BTN_INSET,
                      }
                    : undefined
                }
              >
                No leídas
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-medium text-white md:min-h-[18px] md:min-w-[18px] md:text-[10px]">
                    {unreadCount}
                  </span>
                )}
              </button>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#66DEDB] text-[#0B1217] transition-transform hover:scale-105 md:h-9 md:w-9"
                  style={{ boxShadow: BTN_INSET }}
                  title="Marcar todas como leídas"
                >
                  <span className="translate-y-[-1px] text-lg leading-none md:text-[22px]">…</span>
                </button>
              ) : null}
            </div>
          </div>

          {isLoading && items.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <Image
                src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
                alt=""
                width={56}
                height={56}
                className="mb-4 h-14 w-14 object-contain opacity-80 md:h-16 md:w-16"
                unoptimized
              />
              <p className="text-sm text-gray-400 md:text-base">
                {filter === 'unread'
                  ? 'No tienes notificaciones sin leer'
                  : 'No tienes notificaciones'}
              </p>
            </div>
          ) : (
            <ul className="p-0">
              {items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  resolvedAvatarByUserId={resolvedAvatars}
                  resolvedUsernameByUserId={resolvedUsernames}
                />
              ))}
            </ul>
          )}

          {hasMore && items.length > 0 ? (
            <div className="border-t border-white/[0.08] py-4 text-center md:py-5">
              {isLoading ? (
                <span className="text-xs text-gray-400 md:text-sm">Cargando más…</span>
              ) : (
                <button
                  type="button"
                  onClick={loadMore}
                  className="text-sm font-medium text-[#73FFA2] transition-opacity hover:opacity-85"
                >
                  Cargar más
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
