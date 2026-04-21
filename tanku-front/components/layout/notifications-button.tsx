'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

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
  const [resolvedAvatars, setResolvedAvatars] = useState<Record<string, string>>({})
  const [resolvedUsernames, setResolvedUsernames] = useState<Record<string, string>>({})

  const getNotificationTargetUserId = (n: any): string | null => {
    const data = (n.data || {}) as Record<string, any>
    const loweredType = (n.type || '').toLowerCase()
    const loweredTitle = (n.title || '').toLowerCase()
    const loweredMessage = (n.message || '').toLowerCase()

    const isFriendRequest = loweredType === 'friend_request'
    const isFriendAccepted =
      loweredType === 'friend_accepted' ||
      loweredType.includes('friend_accepted') ||
      loweredType.includes('accepted') ||
      (loweredTitle.includes('solicitud') && loweredTitle.includes('acept')) ||
      (loweredMessage.includes('solicitud') && loweredMessage.includes('acept'))

    if (isFriendRequest) return data.fromUserId || data.userId || data.actorId || data.senderId || null
    if (isFriendAccepted) return data.friendId || data.userId || data.actorId || data.senderId || null
    return data.userId || data.actorId || data.senderId || null
  }

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
    const data = (n.data || {}) as Record<string, any>
    const loweredType = (n.type || '').toLowerCase()
    const loweredTitle = (n.title || '').toLowerCase()
    const loweredMessage = (n.message || '').toLowerCase()
    const isAcceptedRequest =
      loweredType.includes('friend_accepted') ||
      loweredType.includes('accepted') ||
      (loweredTitle.includes('solicitud') && loweredTitle.includes('acept')) ||
      (loweredMessage.includes('solicitud') && loweredMessage.includes('acept'))

    if (isAcceptedRequest || loweredType === 'friend_request') {
      const targetUserId = getNotificationTargetUserId(n)
      const username =
        (targetUserId ? resolvedUsernames[targetUserId] : null) ||
        data.friendUsername ||
        data.fromUsername ||
        data.username ||
        data.actorUsername ||
        data.senderUsername ||
        null
      setIsOpen(false)
      router.push(username ? `/profile/${username}` : '/profile')
      return
    }
  }

  const rowDividerStyle = {
    borderImage: 'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
  } as const

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const latestItems = items.slice(0, 15)

  useEffect(() => {
    if (!isOpen || latestItems.length === 0) return

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

    const userIdsToResolve = latestItems
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
  }, [isOpen, latestItems, resolvedAvatars, resolvedUsernames])

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
        <Image
          src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
          alt="Notificaciones"
          width={compact ? 22 : 30}
          height={compact ? 22 : 30}
          className="object-contain"
          style={{ width: compact ? '22px' : '30px', height: compact ? '22px' : '30px' }}
          unoptimized
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
          <div className="border-b p-4" style={rowDividerStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                  unoptimized
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
                  const data = (n.data || {}) as Record<string, any>
                  const loweredType = (n.type || '').toLowerCase()
                  const loweredTitle = (n.title || '').toLowerCase()
                  const loweredMessage = (n.message || '').toLowerCase()
                  const isAcceptedRequest =
                    loweredType.includes('accepted') ||
                    (loweredTitle.includes('solicitud') && loweredTitle.includes('acept')) ||
                    (loweredMessage.includes('solicitud') && loweredMessage.includes('acept'))
                  const isEventNotification =
                    loweredType.includes('event') ||
                    loweredTitle.includes('evento') ||
                    loweredMessage.includes('evento')
                  const resolvedUserId = getNotificationTargetUserId(n)
                  const avatarCandidate =
                    (resolvedUserId ? resolvedAvatars[resolvedUserId] : null) ||
                    data.avatar ||
                    data.userAvatar ||
                    data.actorAvatar ||
                    data.senderAvatar ||
                    data.user?.profile?.avatar ||
                    data.actor?.profile?.avatar ||
                    data.sender?.profile?.avatar ||
                    data.profileAvatar ||
                    null
                  const avatar = typeof avatarCandidate === 'string' ? avatarCandidate : null
                  const username =
                    data.username || data.actorUsername || data.senderUsername || data.userName || null

                  return (
                    <li
                      key={n.id}
                      className="border-b px-4 py-3 transition-colors hover:bg-white/[0.03]"
                      style={rowDividerStyle}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleNotificationClick(n)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          {isAcceptedRequest ? (
                            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[#66DEDB] bg-gray-700">
                              {avatar ? (
                                <Image
                                  src={avatar}
                                  alt={username || n.title}
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-cover"
                                  unoptimized={avatar.startsWith('http')}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-300">
                                  {(username?.[0] || n.title?.[0] || 'U').toUpperCase()}
                                </div>
                              )}
                            </div>
                          ) : isEventNotification ? (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#66DEDB]/60 bg-[#66DEDB]/10 text-[#73FFA2]">
                              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 3v2m8-2v2M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#66DEDB]/60 bg-[#66DEDB]/10 text-xl">
                              <Image
                                src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
                                alt=""
                                width={22}
                                height={22}
                                className="h-[22px] w-[22px] object-contain"
                                unoptimized
                              />
                            </div>
                          )}
                          {!n.isRead && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#171B21] bg-[#66DEDB]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-semibold leading-none text-white">
                              {n.title}
                            </div>
                            <span className="ml-2 flex-shrink-0 text-sm text-gray-300">{formatTime(n.createdAt)}</span>
                          </div>
                          <div className="truncate text-sm text-gray-400">{n.message}</div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="border-t p-3" style={rowDividerStyle}>
            <button onClick={handleVerTodas} className="block w-full text-center text-sm font-medium text-[#73FFA2] transition-opacity hover:opacity-85">
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


