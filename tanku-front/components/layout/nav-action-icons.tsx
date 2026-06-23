'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/auth-store'
import { CartButton } from '@/components/layout/cart-button'
import { NotificationsButton } from '@/components/layout/notifications-button'
import { MessagesDropdown } from '@/components/layout/messages-dropdown'
import { useChat } from '@/lib/hooks/use-chat'
import { useChatService } from '@/lib/hooks/use-chat-service'
import { getGoogleOAuthUrl } from '@/lib/auth/google-oauth'

interface NavActionIconsProps {
  showJoinButton?: boolean
  initialNotifications?: any[]
  initialUnreadCount?: number
  unreadCount?: number
  className?: string
}

/** Iconos de acción del nav (mensajes, notificaciones, carrito) — mismo aspecto en feed, perfil, mensajes, etc. */
export function NavActionIcons({
  showJoinButton = false,
  initialNotifications,
  initialUnreadCount,
  unreadCount: propUnreadCount,
  className = '',
}: NavActionIconsProps) {
  const { isAuthenticated, user } = useAuthStore()
  const { getTotalUnreadCount, lastReceivedMessage, conversations } = useChat()
  const { messages: chatServiceMessages } = useChatService()
  const [isMessagesDropdownOpen, setIsMessagesDropdownOpen] = useState(false)

  const totalUnread = React.useMemo(() => {
    if (propUnreadCount !== undefined) return propUnreadCount
    return user ? getTotalUnreadCount(user.id) : 0
  }, [user, getTotalUnreadCount, lastReceivedMessage, chatServiceMessages, conversations, propUnreadCount])

  return (
    <div className={`flex shrink-0 items-center gap-2 lg:gap-3 ${className}`}>
      {showJoinButton && !isAuthenticated && (
        <a
          href={getGoogleOAuthUrl('/feed')}
          className="inline-block flex-shrink-0 cursor-pointer rounded-full px-4 py-2 text-center text-xs font-semibold text-black transition-all duration-300 hover:scale-105 hover:shadow-lg sm:px-5 sm:py-2.5 sm:text-sm whitespace-nowrap"
          style={{
            fontFamily: 'Poppins, sans-serif',
            backgroundColor: '#73FFA2',
            boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset',
          }}
        >
          Únete a TANKU
        </a>
      )}
      <div className="relative">
        <button
          onClick={() => setIsMessagesDropdownOpen(!isMessagesDropdownOpen)}
          type="button"
          className="group relative flex cursor-pointer items-center justify-center rounded-lg p-2 transition-colors hover:bg-white/10"
        >
          <Image
            src="/icons_tanku/tanku_nav_mensajes_verde.svg"
            alt="Mensajes"
            width={30}
            height={30}
            className="object-contain"
            style={{ width: '30px', height: '30px' }}
            unoptimized
          />
          {totalUnread > 0 && (
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#1E1E1E] bg-[#66DEDB]" />
          )}
        </button>
        {isAuthenticated && (
          <MessagesDropdown
            isOpen={isMessagesDropdownOpen}
            onClose={() => setIsMessagesDropdownOpen(false)}
            onOpenChat={() => {}}
          />
        )}
      </div>
      <div className="flex h-8 w-8 items-center justify-center md:h-9 md:w-9 lg:h-10 lg:w-10">
        <NotificationsButton
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
      </div>
      <div className="flex h-8 w-8 items-center justify-center md:h-9 md:w-9 lg:h-10 lg:w-10">
        <CartButton />
      </div>
    </div>
  )
}
