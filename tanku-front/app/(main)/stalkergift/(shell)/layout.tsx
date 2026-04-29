'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { GiftIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useChat } from '@/lib/hooks/use-chat'
import { useIsMaxWidth } from '@/lib/hooks/use-is-max-width'
import { STALKERGIFT_PATH } from '@/components/stalkergift/stalkergift-paths'
import { StalkerGiftLegacyUrlCleanup } from '@/components/stalkergift/stalkergift-legacy-url-cleanup'
import { StalkerGiftMisRefreshKeyContext } from '@/components/stalkergift/stalkergift-mis-refresh-context'
import { StalkerGiftModal } from '@/components/stalkergift/stalkergift-modal'
import { Button } from '@/components/ui/button'
import { BaseNav } from '@/components/layout/base-nav'
import { NavBackToFeedLink } from '@/components/layout/nav-back-to-feed'

/** Padding bajo BaseNav + aire extra en mobile (tabs no pegadas al nav). */
const SG_TOP_PT =
  'max-md:pt-[max(4.625rem,calc(env(safe-area-inset-top,0px)+4.125rem))] md:pt-[6.625rem] lg:pt-[4.75rem] xl:pt-[6.5rem]'

function StalkerGiftShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationIdUrl = searchParams.get('conversation')

  const { isAuthenticated } = useAuthStore()
  const { conversations } = useChat()
  const isMobileViewport = useIsMaxWidth(767)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [misRefreshKey, setMisRefreshKey] = useState(0)

  const isChats = pathname === STALKERGIFT_PATH.chats
  const isGifts = pathname === STALKERGIFT_PATH.gifts
  const stalkerGiftTitle = (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="text-white">Stalker</span>
      <span className="font-semibold text-[#FE9600B3]">Gift</span>
      <GiftIcon className="h-[1em] w-[1em] text-[#FE9600B3]" />
    </span>
  )

  const stalkerGiftConvOpen =
    isChats &&
    Boolean(
      conversationIdUrl &&
        conversations.find((c) => c.type === 'STALKERGIFT' && c.id === conversationIdUrl),
    )

  return (
    <StalkerGiftMisRefreshKeyContext.Provider value={misRefreshKey}>
      {!isAuthenticated ? (
        <div className="flex h-screen flex-col items-center justify-center" style={{ backgroundColor: '#1E1E1E' }}>
          <StalkerGiftLegacyUrlCleanup />
          <div className="text-center">
            <p className="mb-4 text-gray-400">Debes iniciar sesión para ver tus regalos</p>
            <Button
              type="button"
              onClick={() => router.push('/feed')}
              className="bg-[#66DEDB] text-black hover:bg-[#5accc9]"
            >
              Ir al inicio
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="relative z-0 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
        >
          <StalkerGiftLegacyUrlCleanup />

          <div
            className={clsx(
              'pointer-events-none relative z-40 h-0 shrink-0 overflow-visible',
              stalkerGiftConvOpen && isMobileViewport && 'hidden',
            )}
          >
            <BaseNav
              showStories={false}
              canHide={false}
              isVisible
              pageTitleRich={stalkerGiftTitle}
              pageTitleColor="#FFFFFF"
              mobileBackCenterTitleCartOnly
              mobileTranslucentNav
              desktopNavTitleCentered
              startContent={<NavBackToFeedLink />}
              className="pointer-events-auto"
            />
          </div>

          <div
            className={clsx(
              'shrink-0 px-4 lg:px-8 xl:px-10',
              SG_TOP_PT,
              stalkerGiftConvOpen && isMobileViewport && 'hidden',
            )}
          >
            <div className="mb-3 flex w-full flex-wrap items-end justify-between gap-x-2 gap-y-2 border-b border-gray-600 sm:mb-4 md:mb-6">
              <div className="flex min-w-0 flex-1 justify-center gap-x-1 overflow-x-auto scrollbar-hide px-0.5 sm:justify-center sm:gap-x-3 sm:px-1 md:gap-x-8">
                <Link
                  href={STALKERGIFT_PATH.chats}
                  className={clsx(
                    'px-2 py-2 text-sm font-medium leading-snug transition-colors sm:px-2 md:px-4 sm:py-1.5 md:py-2 md:text-sm',
                    'whitespace-nowrap',
                    '-mb-px pb-2 sm:pb-1.5',
                    isChats
                      ? 'border-b-2 border-[#FE9600B3] text-[#FE9600B3]'
                      : 'text-[#66DEDB] hover:text-[#FE9600B3]',
                  )}
                >
                  Chats
                </Link>
                <Link
                  href={STALKERGIFT_PATH.gifts}
                  className={clsx(
                    'px-2 py-2 text-sm font-medium leading-snug transition-colors sm:px-2 md:px-4 sm:py-1.5 md:py-2 md:text-sm',
                    'whitespace-nowrap',
                    '-mb-px pb-2 sm:pb-1.5',
                    isGifts
                      ? 'border-b-2 border-[#FE9600B3] text-[#FE9600B3]'
                      : 'text-[#66DEDB] hover:text-[#FE9600B3]',
                  )}
                >
                  <span className="inline-flex items-baseline gap-x-1.5 sm:gap-x-2">
                    <span>Mis</span>
                    <span className="font-semibold tracking-wide">STALKERGIFT</span>
                  </span>
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mb-px inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border border-[#b8650a]/80 px-3 py-2.5 text-sm font-semibold leading-none text-gray-950 shadow-[inset_0_2px_6px_rgba(255,255,255,0.35),inset_0_-2px_6px_rgba(0,0,0,0.22)] transition-[transform,colors] hover:bg-[#ffb347] hover:shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),inset_0_-1px_4px_rgba(0,0,0,0.18)] active:scale-[0.99] sm:gap-x-2 sm:px-4 sm:py-2 sm:text-sm sm:leading-normal"
                style={{ backgroundColor: '#FE9600B3' }}
              >
                <span className="sm:hidden">Enviar</span>
                <span className="hidden items-baseline gap-x-2 sm:inline-flex">
                  <span>Enviar</span>
                  <span className="font-semibold tracking-wide">STALKERGIFT</span>
                </span>
              </button>
            </div>
          </div>

          {children}

          {showCreateModal ? (
            <StalkerGiftModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                setShowCreateModal(false)
                setMisRefreshKey((k) => k + 1)
                router.push(STALKERGIFT_PATH.gifts)
              }}
            />
          ) : null}
        </div>
      )}
    </StalkerGiftMisRefreshKeyContext.Provider>
  )
}

export default function StalkerGiftShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-4 pt-24" style={{ backgroundColor: '#1E1E1E' }}>
          <div className="w-full px-4 text-center lg:px-8 xl:px-10">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#FE9600B3]" />
            <p className="text-gray-400">Cargando...</p>
          </div>
        </div>
      }
    >
      <StalkerGiftShellInner>{children}</StalkerGiftShellInner>
    </Suspense>
  )
}
