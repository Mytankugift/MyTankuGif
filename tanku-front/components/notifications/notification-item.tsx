'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { NotificationItem as NotificationItemType } from '@/lib/hooks/use-notifications'
import {
  formatNotificationTimeShort,
  getNotificationTargetUserId,
  NOTIFICATION_ROW_DIVIDER_STYLE,
} from '@/lib/notifications-display'

interface NotificationItemProps {
  notification: NotificationItemType
  onMarkAsRead: (id: string) => void
  resolvedAvatarByUserId?: Record<string, string>
  resolvedUsernameByUserId?: Record<string, string>
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  resolvedAvatarByUserId = {},
  resolvedUsernameByUserId = {},
}: NotificationItemProps) {
  const router = useRouter()
  const n = notification
  const data = (n.data || {}) as Record<string, unknown>

  const loweredType = (n.type || '').toLowerCase()
  const loweredTitle = (n.title || '').toLowerCase()
  const loweredMessage = (n.message || '').toLowerCase()
  const isAcceptedRequest =
    loweredType.includes('friend_accepted') ||
    loweredType.includes('accepted') ||
    (loweredTitle.includes('solicitud') && loweredTitle.includes('acept')) ||
    (loweredMessage.includes('solicitud') && loweredMessage.includes('acept'))
  const isEventNotification =
    loweredType.includes('event') ||
    loweredTitle.includes('evento') ||
    loweredMessage.includes('evento')

  const resolvedUserId = getNotificationTargetUserId(n)
  const avatarCandidate =
    (resolvedUserId ? resolvedAvatarByUserId[resolvedUserId] : null) ||
    (typeof data.avatar === 'string' ? data.avatar : null) ||
    (typeof data.userAvatar === 'string' ? data.userAvatar : null) ||
    (typeof data.actorAvatar === 'string' ? data.actorAvatar : null) ||
    (typeof data.senderAvatar === 'string' ? data.senderAvatar : null) ||
    null
  const avatar = typeof avatarCandidate === 'string' ? avatarCandidate : null
  const username =
    (resolvedUserId ? resolvedUsernameByUserId[resolvedUserId] : null) ||
    (typeof data.username === 'string' ? data.username : null) ||
    (typeof data.actorUsername === 'string' ? data.actorUsername : null) ||
    (typeof data.senderUsername === 'string' ? data.senderUsername : null) ||
    null

  const handleClick = () => {
    if (!n.isRead) {
      onMarkAsRead(n.id)
    }

    switch (n.type) {
      case 'friend_request':
        router.push('/friends')
        return
      case 'post_like':
      case 'post_comment':
        if (data.posterId) router.push(`/posts/${data.posterId}`)
        return
      case 'comment_mention':
        if (data.posterId) router.push(`/posts/${data.posterId}`)
        return
      case 'gift_received':
        if (data.orderId) router.push(`/orders/${data.orderId}`)
        else router.push('/profile')
        return
      case 'stalker_gift_accepted':
        if (data.conversationId)
          router.push(`/messages?conversation=${data.conversationId}`)
        else router.push('/stalkergift')
        return
      case 'admin_test':
        router.push('/notifications')
        return
      default:
        if (isAcceptedRequest || loweredType.includes('friend_accepted')) {
          router.push(username ? `/profile/${username}` : '/profile')
        }
        break
    }
  }

  return (
    <li
      className="cursor-pointer border-b px-3 py-2.5 transition-colors hover:bg-white/[0.03] md:px-4 md:py-3"
      style={NOTIFICATION_ROW_DIVIDER_STYLE}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2.5 md:gap-3">
        <div className="relative flex-shrink-0">
          {loweredType === 'friend_request' || isAcceptedRequest ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[#66DEDB] bg-gray-700 md:h-12 md:w-12">
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
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-300 md:text-sm">
                  {(username?.[0] || n.title?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
          ) : isEventNotification ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#66DEDB]/60 bg-[#66DEDB]/10 text-[#73FFA2] md:h-12 md:w-12">
              <svg className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 3v2m8-2v2M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
                />
              </svg>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#66DEDB]/60 bg-[#66DEDB]/10 md:h-12 md:w-12">
              <Image
                src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
                alt=""
                width={22}
                height={22}
                className="h-[18px] w-[18px] object-contain md:h-[22px] md:w-[22px]"
                unoptimized
              />
            </div>
          )}
          {!n.isRead && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#171B21] bg-[#66DEDB] md:h-3.5 md:w-3.5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-2 md:mb-1">
            <div className="truncate text-xs font-semibold leading-none text-white md:text-sm">{n.title}</div>
            <span className="ml-2 flex-shrink-0 text-[11px] text-gray-300 md:text-sm">
              {formatNotificationTimeShort(n.createdAt)}
            </span>
          </div>
          <div className="line-clamp-2 text-[11px] leading-snug text-gray-400 md:text-sm">{n.message}</div>
        </div>
      </div>
    </li>
  )
}
