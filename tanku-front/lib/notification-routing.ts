import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import {
  buildSupportCaseProfileHref,
  isSupportCaseNotificationType,
} from '@/lib/support-case-navigation'

type NotificationLike = {
  type?: string
  title?: string
  message?: string
  data?: Record<string, unknown> | null
}

export function getNotificationHref(n: NotificationLike): string | null {
  const data = (n.data || {}) as Record<string, unknown>
  const type = n.type || ''

  switch (type) {
    case 'friend_request':
      return '/friends'
    case 'event_reminder':
      return '/events'
    case 'post_like':
    case 'post_comment':
      if (data.posterId) return `/posts/${data.posterId}`
      return null
    case 'comment_mention':
    case 'comment_reply':
    case 'comment_like':
      if (data.posterId) return `/posts/${data.posterId}`
      return null
    case 'gift_received':
      if (typeof data.orderId === 'string') return `/orders/${data.orderId}`
      return '/profile'
    case 'order_update':
    case 'stalkergift_order_update':
      if (typeof data.orderId === 'string') {
        return `/profile?tab=MIS_TANKUS&orderId=${encodeURIComponent(data.orderId)}`
      }
      return '/profile?tab=MIS_TANKUS'
    case 'support_case_reply':
    case 'support_case_status': {
      const caseId =
        typeof data.supportCaseId === 'string' ? data.supportCaseId : null
      if (!caseId) return '/profile?tab=MIS_TANKUS'
      return buildSupportCaseProfileHref(caseId)
    }
    case 'stalker_gift_accepted':
      if (typeof data.conversationId === 'string') {
        return `/messages?conversation=${data.conversationId}`
      }
      return '/stalkergift'
    case 'admin_test':
      return '/notifications'
    default:
      return null
  }
}

export function navigateFromNotification(
  router: AppRouterInstance,
  n: NotificationLike,
  extras?: {
    username?: string | null
    onBeforeNavigate?: () => void
  }
): boolean {
  const loweredType = (n.type || '').toLowerCase()
  const loweredTitle = (n.title || '').toLowerCase()
  const loweredMessage = (n.message || '').toLowerCase()
  const isAcceptedRequest =
    loweredType.includes('friend_accepted') ||
    loweredType.includes('accepted') ||
    (loweredTitle.includes('solicitud') && loweredTitle.includes('acept')) ||
    (loweredMessage.includes('solicitud') && loweredMessage.includes('acept'))

  if (isAcceptedRequest || loweredType === 'friend_request') {
    extras?.onBeforeNavigate?.()
    const username = extras?.username
    router.push(username ? `/profile/${username}` : '/profile')
    return true
  }

  const href = getNotificationHref(n)
  if (!href) return false

  extras?.onBeforeNavigate?.()
  router.push(href)
  return true
}

export function isSupportCaseNotification(n: NotificationLike): boolean {
  return isSupportCaseNotificationType(n.type)
}
