'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { clsx } from 'clsx'
import { useIsMaxWidth, useIsMinWidth } from '@/lib/hooks/use-is-max-width'
import { useChat } from '@/lib/hooks/use-chat'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ConversationList } from '@/components/chat/conversation-list'
import { ChatWindow } from '@/components/chat/chat-window'
import { BaseNav } from '@/components/layout/base-nav'
import { NavBackToFeedLink } from '@/components/layout/nav-back-to-feed'

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
  /** Solo móvil (max-md): chat a pantalla completa con portal y sin BaseNav; tablet tiene chat dentro de la tarjeta bordeada. */
  const isMobileViewport = useIsMaxWidth(767)
  const isLgUp = useIsMinWidth(1024)

  const [chatPortalMounted, setChatPortalMounted] = useState(false)
  useEffect(() => {
    setChatPortalMounted(true)
  }, [])

  const rowDividerStyle = {
    borderImage:
      'linear-gradient(90deg, #414141 0%, #73FFA2 34%, #73FFA2 70%, #414141 100%) 1',
  } as const

  return (
    <div
      className="relative z-0 flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
    >
      {/* Nav fijo — se oculta en móvil al abrir el chat para que éste cubra toda la pantalla */}
      <div
        className={clsx(
          'pointer-events-none relative z-40 shrink-0 h-0 overflow-visible',
          showMobileChatOverlay && isMobileViewport && 'hidden',
        )}
      >
        <BaseNav
          showStories={false}
          pageTitle="Mensajes"
          pageTitleColor="#FFFFFF"
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
          desktopNavTitleCentered
          startContent={<NavBackToFeedLink />}
          className="pointer-events-auto"
        />
      </div>

      <div
        id="messages-scroll-root"
        className={clsx(
          'custom-scrollbar relative z-0 min-h-0 w-full flex-1 basis-0 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]',
          'px-4 pt-[max(6.25rem,calc(env(safe-area-inset-top,0px)+5.25rem))] pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:px-8 lg:pb-8 lg:pt-28 xl:px-10 xl:pt-36',
          /* Solo móvil: portal a pantalla completa; tablet mantiene scroll y chat dentro del card con borde */
          showMobileChatOverlay && isMobileViewport && 'max-md:hidden',
        )}
        style={{ marginRight: 0, scrollBehavior: 'auto' }}
      >
        <div
          className={clsx(
            'flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#414141] shadow-xl',
            /* Tablet (md–lg): misma tarjeta con borde; lg+ dos columnas con alturas del layout escritorio */
            'md:h-[calc(100dvh-11rem)]',
            'lg:h-[calc(100vh-13rem)] lg:flex-row xl:h-[calc(100vh-14rem)]',
          )}
          style={{ backgroundColor: '#171B21' }}
        >
          {/* Lista */}
          <div
            className={clsx(
              'flex min-h-0 flex-col border-b border-[#414141]',
              'lg:h-auto lg:min-h-0 lg:w-80 lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:border-[#414141]',
              activeConversation ? 'hidden lg:flex' : 'flex flex-1'
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

          {/* Chat: desde md dentro del card bordeado; móvil &lt;md usa portal a pantalla completa */}
          <div
            className={clsx(
              'min-h-0 flex-1 flex-col overflow-hidden',
              activeConversation && selectedConversation ? 'hidden md:flex' : 'hidden lg:flex',
            )}
          >
            {activeConversation && selectedConversation ? (
              <ChatWindow
                conversationId={activeConversation}
                conversation={selectedConversation}
                onMobileBack={
                  isLgUp ? undefined : () => setActiveConversation(null)
                }
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

      {/* Solo móvil (<md): pantalla completa sin BaseNav */}
      {chatPortalMounted &&
        showMobileChatOverlay &&
        selectedConversation &&
        activeConversation &&
        isMobileViewport &&
        typeof document !== 'undefined'
        ? createPortal(
            <div
              className={clsx(
                'fixed inset-x-0 bottom-0 top-0 z-[160] flex min-h-0 flex-col overflow-hidden bg-[#171B21]',
                'pt-[env(safe-area-inset-top,0px)] pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
              )}
              role="dialog"
              aria-modal="true"
              aria-label="Conversación"
            >
              <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                <ChatWindow
                  conversationId={activeConversation}
                  conversation={selectedConversation}
                  onMobileBack={() => setActiveConversation(null)}
                  mobileFullBleedChrome
                />
              </div>
            </div>,
            document.body,
          )
        : null}
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
