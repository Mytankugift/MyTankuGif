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
  return (data.fromUserId ||
    data.userId ||
    data.actorId ||
    data.senderId ||
    null) as string | null
}

/** Tipos que muestran avatar del actor y pueden necesitar fetch por API. */
export function shouldResolveNotificationAvatar(n: { type?: string }): boolean {
  const loweredType = (n.type || '').toLowerCase()
  return (
    loweredType === 'friend_request' ||
    loweredType === 'friend_accepted' ||
    loweredType === 'comment_mention' ||
    loweredType === 'comment_reply' ||
    loweredType === 'post_comment'
  )
}

function pickNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function extractActorNameFromFriendMessage(message?: string | null): string | null {
  if (!message) return null
  const acceptedMatch = message.match(/^(.+?)\s+aceptó\s+tu\s+solicitud/i)
  if (acceptedMatch?.[1]) return acceptedMatch[1].trim()
  const requestMatch = message.match(/^(.+?)\s+te\s+envió\s+una\s+solicitud/i)
  if (requestMatch?.[1]) return requestMatch[1].trim()
  return null
}

function extractActorNameFromMentionMessage(message?: string | null): string | null {
  if (!message) return null
  const mentionMatch = message.match(/^(.+?)\s+te mencion/i)
  if (mentionMatch?.[1]) return mentionMatch[1].trim()
  return null
}

function extractActorNameFromSocialTitle(title?: string | null): string | null {
  if (!title) return null
  const mentionTitle = title.match(/^(.+?)\s+te mencion/i)
  if (mentionTitle?.[1]) return mentionTitle[1].trim()
  const replyTitle = title.match(/^(.+?)\s+respondi[o\u00f3]/i)
  if (replyTitle?.[1]) return replyTitle[1].trim()
  return null
}

export function getNotificationUsername(
  n: {
    type?: string
    title?: string
    message?: string
    data?: Record<string, unknown> | null
  },
  resolvedUsernameByUserId: Record<string, string> = {}
): string | null {
  const data = (n.data || {}) as Record<string, unknown>
  const resolvedUserId = getNotificationTargetUserId(n)

  return pickNonEmptyString(
    resolvedUserId ? resolvedUsernameByUserId[resolvedUserId] : null,
    data.friendUsername,
    data.fromUsername,
    data.username,
    data.actorUsername,
    data.senderUsername,
    data.userName,
    extractActorNameFromSocialTitle(n.title),
    extractActorNameFromFriendMessage(n.message),
    extractActorNameFromMentionMessage(n.message)
  )
}

export function getNotificationAvatar(
  n: {
    type?: string
    title?: string
    message?: string
    data?: Record<string, unknown> | null
  },
  resolvedAvatarByUserId: Record<string, string> = {}
): string | null {
  const data = (n.data || {}) as Record<string, unknown>
  const resolvedUserId = getNotificationTargetUserId(n)

  const nestedUser = data.user as { profile?: { avatar?: unknown } } | undefined
  const nestedActor = data.actor as { profile?: { avatar?: unknown } } | undefined
  const nestedSender = data.sender as { profile?: { avatar?: unknown } } | undefined

  return pickNonEmptyString(
    resolvedUserId ? resolvedAvatarByUserId[resolvedUserId] : null,
    data.friendAvatar,
    data.fromAvatar,
    data.avatar,
    data.userAvatar,
    data.actorAvatar,
    data.senderAvatar,
    data.profileAvatar,
    nestedUser?.profile?.avatar,
    nestedActor?.profile?.avatar,
    nestedSender?.profile?.avatar
  )
}

export function getNotificationAvatarFallback(
  username?: string | null,
  message?: string | null,
  title?: string | null
): string {
  const label =
    username?.trim() ||
    extractActorNameFromSocialTitle(title) ||
    extractActorNameFromFriendMessage(message) ||
    extractActorNameFromMentionMessage(message) ||
    message?.split(/\s+/).slice(0, 2).join(' ').trim() ||
    'Usuario'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=1E1E1E&color=73FFA2&size=128&bold=true`
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
