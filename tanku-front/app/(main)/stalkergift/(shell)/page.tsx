'use client'

import { Suspense } from 'react'
import { clsx } from 'clsx'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useChat } from '@/lib/hooks/use-chat'
import { useIsMaxWidth } from '@/lib/hooks/use-is-max-width'
import { STALKERGIFT_PATH } from '@/components/stalkergift/stalkergift-paths'
import { StalkerGiftChatsPanel } from '@/components/stalkergift/stalkergift-chats-panel'

function StalkerGiftChatsView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const { conversations } = useChat()
  const isMobileViewport = useIsMaxWidth(767)

  const conversationIdUrl = searchParams.get('conversation')
  const stalkerGiftConvOpen =
    pathname === STALKERGIFT_PATH.chats &&
    Boolean(
      conversationIdUrl &&
        conversations.find((c) => c.type === 'STALKERGIFT' && c.id === conversationIdUrl),
    )

  if (!isAuthenticated) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={clsx(
          'relative flex min-h-0 flex-1 flex-col px-4 pt-3 md:pt-4 lg:px-8 xl:px-10',
          stalkerGiftConvOpen && isMobileViewport && 'pt-0',
        )}
      >
        <div className="flex h-full min-h-0 w-full flex-1 flex-col">
          <StalkerGiftChatsPanel />
        </div>
      </div>
    </div>
  )
}

export default function StalkerGiftChatsPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center py-16 text-gray-400">Cargando chats...</div>}>
      <StalkerGiftChatsView />
    </Suspense>
  )
}
