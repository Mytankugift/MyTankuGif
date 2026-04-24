'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { clsx } from 'clsx'
import { useChat } from '@/lib/hooks/use-chat'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ConversationList } from '@/components/chat/conversation-list'
import { ChatWindow } from '@/components/chat/chat-window'
import { BaseNav } from '@/components/layout/base-nav'

// Componente interno que usa useSearchParams
function MessagesClientContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    createOrGetConversation,
  } = useChat()

  const [conversationSearch, setConversationSearch] = useState('')

  const userIdParam = searchParams.get('userId')

  // Si hay userId en la URL, crear/obtener conversación
  useEffect(() => {
    const handleUserIdParam = async () => {
      if (userIdParam && user?.id && userIdParam !== user.id) {
        try {
          const conversation = await createOrGetConversation(userIdParam, 'FRIENDS')
          if (conversation) {
            setActiveConversation(conversation.id)
            router.replace('/messages')
          }
        } catch (error) {
          console.error('Error creando conversación:', error)
        }
      }
    }

    handleUserIdParam()
  }, [userIdParam, user?.id, createOrGetConversation, setActiveConversation, router])

  const selectedConversation = conversations.find((c) => c.id === activeConversation) || null
  const showMobileChatOverlay = Boolean(activeConversation && selectedConversation)

  const rowDividerStyle = {
    borderImage:
      'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
  } as const

  return (
    <div
      className={clsx(
        'relative z-0 flex w-full min-w-0 flex-1 flex-col',
        'max-md:min-h-screen max-md:overflow-x-hidden max-md:overflow-y-visible',
        'md:min-h-0 md:overflow-hidden'
      )}
      style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
    >
      {/* Mismo patrón que /notifications (skill tanku-mobile-vista): nav fijo + scroll en documento en móvil */}
      <div className="pointer-events-none relative z-40 shrink-0 h-0 overflow-visible">
        <BaseNav
          showStories={false}
          pageTitle="Mensajes"
          pageTitleColor="#66DEDB"
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
          desktopNavTitleCentered
          className="pointer-events-auto"
        />
      </div>

      <div
        id="messages-scroll-root"
        className={clsx(
          'custom-scrollbar relative z-0 min-h-0 w-full',
          'max-md:px-4 max-md:pt-[max(6.25rem,calc(env(safe-area-inset-top,0px)+5.25rem))] max-md:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
          'md:px-8 md:pb-8 md:pt-28 lg:px-10 lg:pt-36',
          'max-md:overflow-x-hidden max-md:overflow-y-visible max-md:flex-none',
          'md:flex-1 md:basis-0 md:touch-pan-y md:overflow-x-hidden md:overflow-y-auto md:overscroll-y-contain md:[-webkit-overflow-scrolling:touch]',
          /* Con chat abierto en móvil el overlay cubre todo; ocultamos la caja para no dejar hueco vacío */
          showMobileChatOverlay && 'max-md:hidden'
        )}
        style={{ marginRight: 0, scrollBehavior: 'auto' }}
      >
        <div
          className={clsx(
            'flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#414141] shadow-xl',
            'md:h-[calc(100vh-13rem)] md:flex-row lg:h-[calc(100vh-14rem)]'
          )}
          style={{ backgroundColor: '#171B21' }}
        >
          {/* Lista */}
          <div
            className={clsx(
              'flex min-h-0 flex-col border-b border-[#414141]',
              'md:h-auto md:min-h-0 md:w-80 md:flex-shrink-0 md:border-b-0 md:border-r md:border-[#414141]',
              activeConversation ? 'hidden md:flex' : 'flex flex-1'
            )}
          >
            <div className="shrink-0 border-b p-4" style={rowDividerStyle}>
              <div className="mb-3 flex items-center gap-2">
                <Image
                  src="/icons_tanku/tanku_nav_mensajes_verde_modal_abierto.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 object-contain"
                  unoptimized
                />
                <h2 className="text-base font-semibold leading-none text-white">Conversaciones</h2>
              </div>
              <div className="relative w-full">
                <input
                  type="text"
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  placeholder="Buscar conversación..."
                  className="tanku-pill-search-input h-9 w-full rounded-full border border-white/10 bg-transparent pl-9 pr-3 text-white placeholder:text-[#A7A7A7] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20"
                  aria-label="Buscar conversaciones"
                />
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#73FFA2]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ConversationList
                onSelectConversation={setActiveConversation}
                selectedConversationId={activeConversation}
                searchQuery={conversationSearch}
              />
            </div>
          </div>

          {/* Chat escritorio + vacío */}
          <div className="hidden min-h-0 flex-1 flex-col md:flex">
            {activeConversation && selectedConversation ? (
              <ChatWindow
                conversationId={activeConversation}
                conversation={selectedConversation}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center text-gray-400">
                <Image
                  src="/icons_tanku/tanku_nav_mensajes_verde_modal_abierto.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="mb-3 h-10 w-10 object-contain opacity-80"
                  unoptimized
                />
                <p className="mb-2 text-lg text-white/90">Selecciona una conversación</p>
                <p className="text-sm text-[#A7A7A7]">O inicia una desde tus amigos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Móvil: pantalla completa salvo franja del bottom nav (z por debajo de 999999 del nav) */}
      {showMobileChatOverlay && selectedConversation && activeConversation ? (
        <div
          className="fixed left-0 right-0 top-0 z-[60] flex flex-col bg-[#171B21] md:hidden bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Conversación"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatWindow
              conversationId={activeConversation}
              conversation={selectedConversation}
              onMobileBack={() => setActiveConversation(null)}
              mobileFullBleedChrome
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

// Componente principal con Suspense boundary
export default function MessagesClient() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen"
          style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
        >
          <BaseNav />
          <div className="flex h-screen items-center justify-center">
            <div className="text-center text-gray-400">Cargando...</div>
          </div>
        </div>
      }
    >
      <MessagesClientContent />
    </Suspense>
  )
}
