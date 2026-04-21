/** Estilo compartido con `NotificationsButton` (dropdown del nav). */
export const NOTIFICATION_ROW_DIVIDER_STYLE = {
  borderImage:
    'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
} as const

export function getNotificationTargetUserId(n: {
  type?: string
  title?: string
  message?: string
  data?: Record<string, unknown> | null
}): string | null {
  const data = (n.data || {}) as Record<string, unknown>
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

  if (isFriendRequest)
    return (data.fromUserId ||
      data.userId ||
      data.actorId ||
      data.senderId ||
      null) as string | null
  if (isFriendAccepted)
    return (data.friendId ||
      data.userId ||
      data.actorId ||
      data.senderId ||
      null) as string | null
  return (data.userId || data.actorId || data.senderId || null) as string | null
}

/** Mismo formato corto que el dropdown del nav. */
export function formatNotificationTimeShort(dateString: string) {
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
