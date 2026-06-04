'use client'

import { useRouter } from 'next/navigation'
import type { NotificationItem as NotificationItemType } from '@/lib/hooks/use-notifications'
import {
  formatNotificationTimeShort,
  getNotificationTargetUserId,
  NOTIFICATION_ROW_DIVIDER_STYLE,
} from '@/lib/notifications-display'
import { navigateFromNotification, isSupportCaseNotification } from '@/lib/notification-routing'
import {
  NotificationIcon,
  notificationRowClassName,
} from '@/components/notifications/notification-icon'

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
    navigateFromNotification(router, n, { username })
  }

  const isSupport = isSupportCaseNotification(n)

  return (
    <li
      className={notificationRowClassName(n)}
      style={NOTIFICATION_ROW_DIVIDER_STYLE}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2.5 md:gap-3">
        <div className="relative flex-shrink-0">
          <NotificationIcon notification={n} avatar={avatar} username={username} />
          {!n.isRead && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#171B21] md:h-3.5 md:w-3.5 ${
                isSupport ? 'bg-amber-400' : 'bg-[#66DEDB]'
              }`}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-2 md:mb-1">
            <div
              className={`truncate text-xs font-semibold leading-none md:text-sm ${
                isSupport ? 'text-amber-100' : 'text-white'
              }`}
            >
              {n.title}
            </div>
            <span className="ml-2 flex-shrink-0 text-[11px] text-gray-300 md:text-sm">
              {formatNotificationTimeShort(n.createdAt)}
            </span>
          </div>
          <div
            className={`line-clamp-2 text-[11px] leading-snug md:text-sm ${
              isSupport ? 'text-amber-200/80' : 'text-gray-400'
            }`}
          >
            {n.message}
          </div>
        </div>
      </div>
    </li>
  )
}
