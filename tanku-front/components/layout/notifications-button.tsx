'use client'

import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { useResolveNotificationActors } from '@/lib/hooks/use-resolve-notification-actors'
import { useEffect, useRef } from 'react'
import {
  formatNotificationTimeShort,
  getNotificationAvatar,
  getNotificationTargetUserId,
  getNotificationUsername,
  NOTIFICATION_ROW_DIVIDER_STYLE,
} from '@/lib/notifications-display'
import { navigateFromNotification, isSupportCaseNotification } from '@/lib/notification-routing'
import {
  NotificationIcon,
  notificationRowClassName,
} from '@/components/notifications/notification-icon'
import {
  NotificationMessageContent,
  NotificationTitleContent,
} from '@/components/notifications/notification-title-content'

interface NotificationsButtonProps {
  // ✅ Props opcionales desde feedInit para evitar llamadas duplicadas
  initialNotifications?: any[]
  initialUnreadCount?: number
  /** Nav móvil: icono y badge más pequeños */
  compact?: boolean
}

export function NotificationsButton({
  initialNotifications,
  initialUnreadCount,
  compact = false,
}: NotificationsButtonProps = {}) {
  const { unreadCount, items, isOpen, isLoading, setIsOpen, fetchList, markAllAsRead } = useNotifications({
    initialData: initialNotifications || initialUnreadCount !== undefined
      ? {
          items: initialNotifications,
          unreadCount: initialUnreadCount,
        }
      : undefined,
  })
  const router = useRouter()
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const latestItems = items.slice(0, 15)
  const { resolvedAvatars, resolvedUsernames } = useResolveNotificationActors(latestItems)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      // No cerrar si el click es dentro del botón o del dropdown
      if (
        btnRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return
      }
      setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', onClickOutside)
    }
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isOpen, setIsOpen])

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await markAllAsRead()
    await fetchList({ limit: 15, offset: 0 })
  }

  const handleVerTodas = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    router.push('/notifications')
  }

  const handleNotificationClick = (n: any) => {
    const targetUserId = getNotificationTargetUserId(n)
    const username = getNotificationUsername(n, resolvedUsernames)

    const navigated = navigateFromNotification(router, n, {
      username,
      onBeforeNavigate: () => setIsOpen(false),
    })
    if (!navigated) {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchList({ limit: 15, offset: 0 })
        }}
        className={`relative rounded-lg hover:bg-white/10 transition-colors ${compact ? 'p-1' : 'p-2'}`}
        aria-label="Notificaciones"
      >
        <img
          src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
          alt="Notificaciones"
          className={compact ? 'h-[22px] w-auto' : 'h-[30px] w-auto'}
        />
        {unreadCount > 0 && (
          <span
            className={`absolute flex items-center justify-center rounded-full bg-red-500 px-0.5 font-medium text-white ${
              compact
                ? '-right-0.5 -top-0.5 min-h-[14px] min-w-[14px] text-[9px]'
                : '-right-1 -top-1 min-h-[18px] min-w-[18px] text-[10px]'
            }`}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-50 flex h-[500px] w-[400px] flex-col rounded-xl border border-[#414141] shadow-xl"
          style={{
            top: (btnRef.current?.getBoundingClientRect().bottom || 0) + 8,
            right: Math.max(12, window.innerWidth - (btnRef.current?.getBoundingClientRect().right || 0)),
            backgroundColor: '#171B21',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b p-4" style={NOTIFICATION_ROW_DIVIDER_STYLE}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
                  alt=""
                  className="h-7 w-auto"
                />
                <h4 className="text-base font-semibold text-white">Notificaciones</h4>
              </div>
              <button
                onClick={handleMarkAllAsRead}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#66DEDB] text-[#0B1217] transition-transform hover:scale-105"
                title="Marcar todas como leídas"
              >
                <span className="translate-y-[-1px] text-[22px] leading-none">…</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
            {isLoading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Cargando...</div>
            ) : latestItems.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">Sin notificaciones</div>
            ) : (
              <ul>
                {latestItems.map((n) => {
                  const avatar = getNotificationAvatar(n, resolvedAvatars)
                  const username = getNotificationUsername(n, resolvedUsernames)
                  const isSupport = isSupportCaseNotification(n)

                  return (
                    <li
                      key={n.id}
                      className={`${notificationRowClassName(n)} px-4`}
                      style={NOTIFICATION_ROW_DIVIDER_STYLE}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleNotificationClick(n)
                      }}
                    >
                      <div className="flex items-start gap-3 py-1">
                        <div className="relative flex-shrink-0 pt-0.5">
                          <NotificationIcon
                            notification={n}
                            avatar={avatar}
                            username={username}
                            size="lg"
                          />
                          {!n.isRead && (
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#171B21] ${
                                isSupport ? 'bg-amber-400' : 'bg-[#66DEDB]'
                              }`}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-start justify-between gap-2">
                            <div
                              className={`line-clamp-2 text-sm font-semibold leading-snug ${
                                isSupport ? 'text-amber-100' : 'text-white'
                              }`}
                            >
                              <NotificationTitleContent
                                title={n.title}
                                type={n.type}
                                message={n.message}
                                isSupport={isSupport}
                              />
                            </div>
                            <span className="ml-2 flex-shrink-0 text-xs text-gray-300 pt-0.5">
                              {formatNotificationTimeShort(n.createdAt)}
                            </span>
                          </div>
                          <div
                            className={`line-clamp-2 text-sm leading-snug ${
                              isSupport ? 'text-amber-200/80' : 'text-gray-400'
                            }`}
                          >
                            <NotificationMessageContent
                              message={n.message}
                              type={n.type}
                              isSupport={isSupport}
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="border-t p-3" style={NOTIFICATION_ROW_DIVIDER_STYLE}>
            <button onClick={handleVerTodas} className="block w-full text-center text-sm font-medium text-[#73FFA2] transition-opacity hover:opacity-85">
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


