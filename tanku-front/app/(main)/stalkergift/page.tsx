'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { GiftIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useChat } from '@/lib/hooks/use-chat'
import { useIsMaxWidth } from '@/lib/hooks/use-is-max-width'
import { StalkerGiftTabs } from '@/components/stalkergift/stalkergift-tabs'
import { StalkerGiftChatsPanel } from '@/components/stalkergift/stalkergift-chats-panel'
import { StalkerGiftCard } from '@/components/stalkergift/stalkergift-card'
import { StalkerGiftModal } from '@/components/stalkergift/stalkergift-modal'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { StalkerGiftDTO } from '@/types/api'
import { BaseNav } from '@/components/layout/base-nav'
import { NavBackToFeedLink } from '@/components/layout/nav-back-to-feed'
import { StalkerGiftOrdersTab } from '@/components/profile/stalkergift-orders-tab'
import type { StalkerGiftMainTab } from '@/components/stalkergift/stalkergift-tabs'

type StalkerGiftTab = StalkerGiftMainTab

function StalkerGiftPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabQuery = searchParams.get('tab')
  const orderIdQuery = searchParams.get('orderId')
  const conversationIdUrl = searchParams.get('conversation')

  const { user, isAuthenticated } = useAuthStore()
  const { conversations } = useChat()
  const isMobileViewport = useIsMaxWidth(767)

  const [activeTab, setActiveTab] = useState<StalkerGiftTab>('chats')
  const [receivedGifts, setReceivedGifts] = useState<StalkerGiftDTO[]>([])
  const [sentGifts, setSentGifts] = useState<StalkerGiftDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')

  const stalkerGiftConvOpen =
    activeTab === 'chats' &&
    Boolean(conversationIdUrl &&
      conversations.find((c) => c.type === 'STALKERGIFT' && c.id === conversationIdUrl))

  const goTab = (tab: StalkerGiftTab) => {
    setActiveTab(tab)
    const q = new URLSearchParams(searchParams.toString())
    q.set('tab', tab)
    if (tab !== 'chats') q.delete('conversation')
    router.replace(`/stalkergift?${q.toString()}`, { scroll: false })
  }

  const loadReceivedGifts = async () => {
    if (!isAuthenticated || !user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.get<StalkerGiftDTO[]>(
        API_ENDPOINTS.STALKER_GIFT.RECEIVED
      )

      if (response.success && response.data) {
        setReceivedGifts(response.data)
      } else {
        setError(response.error?.message || 'Error al cargar regalos recibidos')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar regalos recibidos'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSentGifts = async () => {
    if (!isAuthenticated || !user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.get<StalkerGiftDTO[]>(
        API_ENDPOINTS.STALKER_GIFT.SENT
      )

      if (response.success && response.data) {
        setSentGifts(response.data)
      } else {
        setError(response.error?.message || 'Error al cargar regalos enviados')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar regalos enviados'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    loadReceivedGifts()
    loadSentGifts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (
      tabQuery === 'received' ||
      tabQuery === 'sent' ||
      tabQuery === 'chats' ||
      tabQuery === 'orders'
    ) {
      setActiveTab(tabQuery)
    }
  }, [tabQuery])

  const filteredReceivedGifts = receivedGifts.filter((gift) => {
    if (filter === 'all') return true
    if (filter === 'pending') return gift.estado === 'WAITING_ACCEPTANCE' || gift.estado === 'PAID'
    if (filter === 'accepted') return gift.estado === 'ACCEPTED'
    if (filter === 'rejected') return gift.estado === 'REJECTED'
    return true
  })

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-400">Debes iniciar sesión para ver tus regalos</p>
          <Button
            onClick={() => router.push('/feed')}
            className="bg-[#66DEDB] text-black hover:bg-[#5accc9]"
          >
            Ir al inicio
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative z-0 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
    >
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
          pageTitle="StalkerGift"
          pageTitleColor="#FFFFFF"
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
          desktopNavTitleCentered
          startContent={<NavBackToFeedLink />}
          className="pointer-events-auto"
        />
      </div>

      {activeTab === 'chats' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={clsx(
              'shrink-0 border-b border-white/[0.08] px-4 pb-3',
              'pt-[max(6.25rem,calc(env(safe-area-inset-top,0px)+5.25rem))]',
              'md:px-6 md:pt-[10rem] lg:px-10 lg:pt-28 xl:pt-36',
              stalkerGiftConvOpen && isMobileViewport && 'hidden',
            )}
          >
            <div className="mx-auto max-w-6xl">
              <StalkerGiftTabs
                activeTab={activeTab}
                onTabChange={goTab}
                onSendTanku={() => setShowCreateModal(true)}
              />
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col px-4 md:px-6 lg:px-10 xl:px-10">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col">
              <StalkerGiftChatsPanel />
            </div>
          </div>
        </div>
      ) : (
        <div
          id="stalkergift-scroll-root"
          className={clsx(
            'custom-scrollbar relative z-0 min-h-0 w-full flex-1 basis-0 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain px-2 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] pt-[max(8.5rem,calc(env(safe-area-inset-top,0px)+7.25rem))] [-webkit-overflow-scrolling:touch] sm:px-3 md:px-4 md:pb-5 md:pt-[10rem] lg:pt-[10.5rem]',
          )}
          style={{
            marginRight: 0,
            scrollBehavior: 'smooth',
            scrollPaddingTop: 'max(env(safe-area-inset-top),12px)',
            scrollPaddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div className="mx-auto w-full max-w-6xl pb-6 sm:px-0">
            <StalkerGiftTabs
              activeTab={activeTab}
              onTabChange={goTab}
              onSendTanku={() => setShowCreateModal(true)}
            />

            {activeTab === 'received' && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                    filter === 'all'
                      ? 'bg-[#66DEDB] font-semibold text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('pending')}
                  className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                    filter === 'pending'
                      ? 'bg-[#66DEDB] font-semibold text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Pendientes
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('accepted')}
                  className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                    filter === 'accepted'
                      ? 'bg-[#66DEDB] font-semibold text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Aceptados
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('rejected')}
                  className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                    filter === 'rejected'
                      ? 'bg-[#66DEDB] font-semibold text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Rechazados
                </button>
              </div>
            )}

            <div className="mt-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {activeTab === 'orders' && user?.id ? (
                <StalkerGiftOrdersTab userId={user.id} initialOrderId={orderIdQuery} />
              ) : activeTab === 'received' || activeTab === 'sent' ? (
                isLoading ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#73FFA2]" />
                    <p className="text-gray-400">Cargando regalos...</p>
                  </div>
                ) : (
                <>
                  {activeTab === 'received' && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredReceivedGifts.length === 0 ? (
                        <div className="col-span-full py-12 text-center">
                          <GiftIcon className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                          <p className="text-gray-400">No tienes regalos recibidos</p>
                        </div>
                      ) : (
                        filteredReceivedGifts.map((gift) => (
                          <StalkerGiftCard
                            key={gift.id}
                            gift={gift}
                            type="received"
                            onUpdate={() => loadReceivedGifts()}
                          />
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'sent' && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {sentGifts.length === 0 ? (
                        <div className="col-span-full py-12 text-center">
                          <GiftIcon className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                          <p className="text-gray-400">No has enviado ningún regalo</p>
                        </div>
                      ) : (
                        sentGifts.map((gift) => (
                          <StalkerGiftCard
                            key={gift.id}
                            gift={gift}
                            type="sent"
                            onUpdate={() => loadSentGifts()}
                          />
                        ))
                      )}
                    </div>
                  )}
                </>
              )
            ) : null}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <StalkerGiftModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadSentGifts()
          }}
        />
      )}
    </div>
  )
}

export default function StalkerGiftPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen p-4 pt-24 sm:p-6 sm:pt-28 md:p-8 md:pt-32"
          style={{ backgroundColor: '#1E1E1E' }}
        >
          <div className="mx-auto max-w-6xl text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#73FFA2]" />
            <p className="text-gray-400">Cargando...</p>
          </div>
        </div>
      }
    >
      <StalkerGiftPageContent />
    </Suspense>
  )
}
