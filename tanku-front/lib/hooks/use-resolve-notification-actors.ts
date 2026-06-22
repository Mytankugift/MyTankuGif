'use client'

import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  getNotificationAvatar,
  getNotificationTargetUserId,
  getNotificationUsername,
  shouldResolveNotificationAvatar,
} from '@/lib/notifications-display'

type NotificationLike = {
  type?: string
  title?: string
  message?: string
  data?: Record<string, unknown> | null
}

export function useResolveNotificationActors(items: NotificationLike[]) {
  const [resolvedAvatars, setResolvedAvatars] = useState<Record<string, string>>({})
  const [resolvedUsernames, setResolvedUsernames] = useState<Record<string, string>>({})
  const attemptedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (items.length === 0) return

    const userIdsToResolve = [
      ...new Set(
        items
          .filter(shouldResolveNotificationAvatar)
          .map((n) => getNotificationTargetUserId(n))
          .filter((id): id is string => Boolean(id))
          .filter((id) => {
            if (attemptedRef.current.has(id)) return false

            const related = items.filter((n) => getNotificationTargetUserId(n) === id)
            const hasAvatar = related.some((n) => Boolean(getNotificationAvatar(n, resolvedAvatars)))
            const hasUsername = related.some((n) =>
              Boolean(getNotificationUsername(n, resolvedUsernames))
            )

            return !hasAvatar || !hasUsername
          })
      ),
    ]

    if (userIdsToResolve.length === 0) return

    let cancelled = false

    void (async () => {
      try {
        const response = await apiClient.post<{
          users: Array<{
            id: string
            username: string | null
            avatar: string | null
          }>
        }>(API_ENDPOINTS.USERS.GET_BY_IDS, { userIds: userIdsToResolve })

        if (cancelled) return

        const nextAvatars: Record<string, string> = {}
        const nextUsernames: Record<string, string> = {}

        if (response.success && response.data?.users) {
          for (const user of response.data.users) {
            attemptedRef.current.add(user.id)
            if (user.avatar) nextAvatars[user.id] = user.avatar
            if (user.username) nextUsernames[user.id] = user.username
          }
        }

        for (const userId of userIdsToResolve) {
          attemptedRef.current.add(userId)
        }

        if (Object.keys(nextAvatars).length > 0) {
          setResolvedAvatars((prev) => ({ ...prev, ...nextAvatars }))
        }
        if (Object.keys(nextUsernames).length > 0) {
          setResolvedUsernames((prev) => ({ ...prev, ...nextUsernames }))
        }
      } catch {
        for (const userId of userIdsToResolve) {
          attemptedRef.current.add(userId)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [items, resolvedAvatars, resolvedUsernames])

  return { resolvedAvatars, resolvedUsernames }
}
