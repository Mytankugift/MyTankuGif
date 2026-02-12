'use client'

import { useRouter } from 'next/navigation'
import { NotificationItem as NotificationItemType } from '@/lib/hooks/use-notifications'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface NotificationItemProps {
  notification: NotificationItemType
  onMarkAsRead: (id: string) => void
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const router = useRouter()

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }

    // Navegar según el tipo de notificación
    const data = notification.data || {}
    
    switch (notification.type) {
      case 'friend_request':
        router.push('/friends')
        break
      case 'post_like':
      case 'post_comment':
        if (data.posterId) {
          router.push(`/posts/${data.posterId}`)
        }
        break
      case 'comment_mention':
        if (data.posterId) {
          router.push(`/posts/${data.posterId}`)
        }
        break
      case 'gift_received':
        if (data.orderId) {
          router.push(`/orders/${data.orderId}`)
        } else {
          router.push('/profile')
        }
        break
      case 'stalker_gift_accepted':
        if (data.conversationId) {
          router.push(`/messages?conversation=${data.conversationId}`)
        } else {
          router.push('/stalkergift')
        }
        break
      default:
        // No navegar para otros tipos
        break
    }
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'friend_request':
        return '👋'
      case 'post_like':
        return '❤️'
      case 'post_comment':
      case 'comment_mention':
        return '💬'
      case 'gift_received':
        return '🎁'
      case 'stalker_gift_accepted':
        return '🎉'
      default:
        return '🔔'
    }
  }

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: es,
  })

  return (
    <div
      className={`p-4 rounded-lg border transition-all cursor-pointer hover:opacity-90 ${
        notification.isRead
          ? 'border-gray-800 bg-gray-900/50'
          : 'border-[#73FFA2]/30 bg-[#73FFA2]/5'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{getIcon()}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4
                className={`text-sm font-semibold mb-1 ${
                  notification.isRead ? 'text-gray-300' : 'text-[#73FFA2]'
                }`}
              >
                {notification.title}
              </h4>
              <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                {notification.message}
              </p>
              <span className="text-xs text-gray-500">{timeAgo}</span>
            </div>
            
            {!notification.isRead && (
              <div className="w-2 h-2 rounded-full bg-[#73FFA2] flex-shrink-0 mt-1"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

