'use client'

import { useRouter } from 'next/navigation'
import type { NotificationItem as NotificationItemType } from '@/lib/hooks/use-notifications'
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

  const resolvedUserId = getNotificationTargetUserId(n)
  const avatar = getNotificationAvatar(n, resolvedAvatarByUserId)
  const username = getNotificationUsername(n, resolvedUsernameByUserId)

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
      <div className="flex items-start gap-2.5 md:gap-3">
        <div className="relative flex-shrink-0 pt-0.5">
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
          <div className="mb-0.5 flex items-start justify-between gap-2 md:mb-1">
            <div
              className={`line-clamp-2 text-xs font-semibold leading-snug md:text-sm ${
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
            <span className="ml-2 flex-shrink-0 text-[11px] text-gray-300 pt-0.5 md:text-sm">
              {formatNotificationTimeShort(n.createdAt)}
            </span>
          </div>
          <div
            className={`line-clamp-2 text-[11px] leading-snug md:text-sm ${
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
}
