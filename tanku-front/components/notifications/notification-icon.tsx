'use client'

import Image from 'next/image'
import { LifebuoyIcon } from '@heroicons/react/24/outline'
import { isSupportCaseNotification } from '@/lib/notification-routing'

interface NotificationIconProps {
  notification: {
    type?: string
    title?: string
    message?: string
  }
  avatar?: string | null
  username?: string | null
  /** Nav dropdown usa iconos un poco más grandes */
  size?: 'md' | 'lg'
}

export function NotificationIcon({
  notification,
  avatar,
  username,
  size = 'md',
}: NotificationIconProps) {
  const n = notification
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

  const boxMd = 'h-10 w-10 md:h-12 md:w-12'
  const boxLg = 'h-12 w-12'
  const box = size === 'lg' ? boxLg : boxMd

  if (isSupportCaseNotification(n)) {
    return (
      <div
        className={`flex ${box} shrink-0 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/15 text-amber-300`}
      >
        <LifebuoyIcon className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5 md:h-6 md:w-6'} />
      </div>
    )
  }

  if (loweredType === 'friend_request' || isAcceptedRequest) {
    return (
      <div
        className={`relative ${box} shrink-0 overflow-hidden rounded-full border border-[#66DEDB] bg-gray-700`}
      >
        {avatar ? (
          <Image
            src={avatar}
            alt={username || n.title || ''}
            width={48}
            height={48}
            className="h-full w-full object-cover"
            unoptimized={avatar.startsWith('http')}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center font-semibold text-gray-300 ${
              size === 'lg' ? 'text-sm' : 'text-xs md:text-sm'
            }`}
          >
            {(username?.[0] || n.title?.[0] || 'U').toUpperCase()}
          </div>
        )}
      </div>
    )
  }

  if (isEventNotification) {
    return (
      <div
        className={`flex ${box} shrink-0 items-center justify-center rounded-full border border-[#66DEDB]/60 bg-[#66DEDB]/10 text-[#73FFA2]`}
      >
        <svg
          className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5 md:h-6 md:w-6'}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 3v2m8-2v2M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
          />
        </svg>
      </div>
    )
  }

  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center rounded-full border border-[#66DEDB]/60 bg-[#66DEDB]/10`}
    >
      <Image
        src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
        alt=""
        width={22}
        height={22}
        className={
          size === 'lg'
            ? 'h-[22px] w-[22px] object-contain'
            : 'h-[18px] w-[18px] object-contain md:h-[22px] md:w-[22px]'
        }
        unoptimized
      />
    </div>
  )
}

export function notificationRowClassName(notification: { type?: string }): string {
  const base =
    'cursor-pointer border-b px-3 py-2.5 transition-colors hover:bg-white/[0.03] md:px-4 md:py-3'
  if (isSupportCaseNotification(notification)) {
    return `${base} border-l-2 border-l-amber-400/70 bg-amber-500/[0.06] hover:bg-amber-500/10`
  }
  return base
}
