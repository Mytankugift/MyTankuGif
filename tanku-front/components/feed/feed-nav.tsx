'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { CartButton } from '@/components/layout/cart-button'
import { NotificationsButton } from '@/components/layout/notifications-button'
import { MessagesDropdown } from '@/components/layout/messages-dropdown'
import { useChat } from '@/lib/hooks/use-chat'
import { FeedStoriesStrip } from '@/components/feed/feed-stories-strip'
import {
  FeedCategoryActivePill,
  type FeedCategoryActivePillCategory,
} from '@/components/feed/feed-category-active-pill'
import { FEED_RESET_FILTERS_EVENT } from '@/lib/constants/feed-events'
import type { FeedNavScrollState } from '@/lib/hooks/use-feed-scroll-nav'
import { clsx } from 'clsx'
import { getGoogleOAuthUrl } from '@/lib/auth/google-oauth'

/** Mismos textos rotativos que landing-nav */
const ROTATING_FEED_NAV_TEXTS = [
  "Don't Give a Like, Give a TANKU",
  'Bienvenido al primer GivE-Commerce del mundo',
  'Conecta con lo que te hace feliz',
] as const

interface FeedNavProps {
  /** Valor del input de búsqueda de productos (el padre aplica debounce al API) */
  searchInput?: string
  onSearchInputChange?: (query: string) => void
  /** Enter o acción explícita: aplicar búsqueda sin esperar al debounce */
  onSearchCommit?: () => void
  /** Scroll del feed: historias / compacto / minimal */
  feedNavScroll: FeedNavScrollState
  // ✅ Props opcionales desde feedInit para evitar llamadas duplicadas
  conversations?: any[]
  unreadCount?: number
  stories?: any[]
  notifications?: any[]
  notificationsUnreadCount?: number
  /** Móvil: icono categorías abre modal (padre controla estado) */
  onOpenCategoriesModal?: () => void
  /** Estados «Explorar» compartidos con strip de historias en scroll (móvil) */
  feedExplorarActivated: boolean
  onFeedExplorarActivated: () => void
  /** false en &lt; md: el strip de historias está en el scroll del feed, no aquí */
  showStoriesStripInFixedNav?: boolean
  /** Con categoría activa se ocultan historias y se muestra la pastilla de filtro */
  activeCategoryFilter?: FeedCategoryActivePillCategory | null
  onClearCategoryFilter?: () => void
}

export function FeedNav({
  searchInput = '',
  onSearchInputChange = () => {},
  onSearchCommit = () => {},
  feedNavScroll,
  conversations: propConversations,
  unreadCount: propUnreadCount,
  stories: propStories,
  notifications: propNotifications,
  notificationsUnreadCount: propNotificationsUnreadCount,
  onOpenCategoriesModal,
  feedExplorarActivated,
  onFeedExplorarActivated,
  showStoriesStripInFixedNav = true,
  activeCategoryFilter = null,
  onClearCategoryFilter,
}: FeedNavProps) {
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuthStore()
  const [isMessagesDropdownOpen, setIsMessagesDropdownOpen] = useState(false)
  const [rotatingTextIndex, setRotatingTextIndex] = useState(0)
  const [textOpacity, setTextOpacity] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setTextOpacity(0)
      setTimeout(() => {
        setRotatingTextIndex((prev) => (prev + 1) % ROTATING_FEED_NAV_TEXTS.length)
        setTextOpacity(1)
      }, 300)
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // ✅ Siempre llamar useChat (regla de hooks), pero usar propConversations si están disponibles
  const chatHook = useChat()
  const conversations = propConversations ?? chatHook.conversations
  const unreadCount = propUnreadCount ?? (user ? chatHook.getTotalUnreadCount(user.id) : 0)
  
  // ✅ Usar totalUnread para badge
  const totalUnread = unreadCount

  const handleOpenChat = (conversationId: string) => {
    // El dropdown ahora maneja el chat internamente, no necesitamos abrir ventanas flotantes
    // Esta función se mantiene por compatibilidad pero no hace nada
  }

  const { showStoriesStrip, compactMid } = feedNavScroll

  return (
    <div className="w-full bg-transparent">
      {/* Stories Section */}
      <div className="px-2 sm:px-3 md:px-4 pt-2 sm:pt-3 md:pt-4 pb-0 flex flex-col md:flex-row justify-between items-center w-full gap-0.5 sm:gap-1 md:gap-1">
        {/* Layout móvil cuando no está autenticado */}
        {!isAuthenticated ? (
          <>
            {/* Fila móvil: Logo + Texto + Botón en la misma línea */}
            <div className="md:hidden w-full flex items-center gap-2 mb-2">
              {/* Logo Tanku a la izquierda */}
              <div className="flex-shrink-0">
                <Image 
                  src="/feed/logo-tanku.svg" 
                  alt="Logo Tanku" 
                  width={70} 
                  height={70} 
                  className="object-contain"
                  style={{ width: '70px', height: '70px' }}
                  priority={false}
                  loading="eager"
                  unoptimized
                />
              </div>
              {/* Texto en el medio (rotativo, igual que landing) */}
              <div
                className="flex-1 min-w-0"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 'bold',
                  fontSize: 'clamp(12px, 3vw, 18px)',
                  lineHeight: '1.2',
                  background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent',
                  opacity: textOpacity,
                  transition: 'opacity 0.3s ease-in-out',
                }}
              >
                {ROTATING_FEED_NAV_TEXTS[rotatingTextIndex]}
              </div>
              {/* Botón Únete a Tanku a la derecha */}
              <div className="flex-shrink-0">
                <a
                  href={getGoogleOAuthUrl('/feed')}
                  className="text-black font-semibold px-3 py-1.5 rounded-full hover:shadow-lg transition-all duration-300 hover:transform hover:scale-105 text-xs whitespace-nowrap flex-shrink-0 cursor-pointer inline-block text-center"
                  style={{ 
                    fontFamily: 'Poppins, sans-serif',
                    backgroundColor: '#73FFA2',
                    boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset'
                  }}
                >
                  Únete a TANKU
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="flex w-full flex-col gap-2 sm:gap-2.5">
            {/* Tablet/desktop: eslogan centrado + iconos a la derecha */}
            <div className="relative hidden md:flex w-full items-center justify-center py-0.5">
              <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex items-center gap-2 sm:gap-2.5 lg:gap-3">
                <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5 lg:gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsMessagesDropdownOpen(!isMessagesDropdownOpen)}
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
                        <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#1E1E1E] bg-[#66DEDB]" />
                      )}
                    </button>
                    <MessagesDropdown
                      isOpen={isMessagesDropdownOpen}
                      onClose={() => setIsMessagesDropdownOpen(false)}
                      onOpenChat={handleOpenChat}
                    />
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center md:h-9 md:w-9 lg:h-10 lg:w-10">
                    <NotificationsButton
                      initialNotifications={propNotifications}
                      initialUnreadCount={propNotificationsUnreadCount}
                    />
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center md:h-9 md:w-9 lg:h-10 lg:w-10">
                    <CartButton />
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col items-center transition-all duration-300 ease-out">
              <div className="hidden w-full justify-center md:flex lg:hidden">
                <div
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    lineHeight: '1.2',
                    background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent',
                    whiteSpace: 'nowrap',
                    opacity: textOpacity,
                    transition: 'opacity 0.3s ease-in-out',
                  }}
                >
                  {ROTATING_FEED_NAV_TEXTS[rotatingTextIndex]}
                </div>
              </div>
              <div className="hidden w-full justify-center lg:flex">
                <div
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 'bold',
                    fontSize: '32px',
                    lineHeight: '1.2',
                    background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent',
                    whiteSpace: 'nowrap',
                    opacity: textOpacity,
                    transition: 'opacity 0.3s ease-in-out',
                  }}
                >
                  {ROTATING_FEED_NAV_TEXTS[rotatingTextIndex]}
                </div>
              </div>
              </div>
            </div>

            {/* Historias + Explorar, o pastilla (solo tablet/desktop; en móvil va en el scroll del feed) */}
            {showStoriesStripInFixedNav && (
              <div className="hidden w-full md:block">
                {activeCategoryFilter ? (
                  <FeedCategoryActivePill
                    category={activeCategoryFilter}
                    onClear={() => onClearCategoryFilter?.()}
                  />
                ) : (
                  <FeedStoriesStrip
                    showStoriesStrip={showStoriesStrip}
                    stories={propStories}
                    feedExplorarActivated={feedExplorarActivated}
                    onExplorarActivated={onFeedExplorarActivated}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {!isAuthenticated && (
          <div className="hidden md:flex lg:hidden flex-1 min-w-0 items-center justify-center">
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 'bold',
                fontSize: '24px',
                lineHeight: '1.2',
                background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
                whiteSpace: 'nowrap',
                opacity: textOpacity,
                transition: 'opacity 0.3s ease-in-out',
              }}
            >
              {ROTATING_FEED_NAV_TEXTS[rotatingTextIndex]}
            </div>
          </div>
        )}
        {!isAuthenticated && (
          <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center">
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 'bold',
                fontSize: '32px',
                lineHeight: '1.2',
                background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
                whiteSpace: 'nowrap',
                opacity: textOpacity,
                transition: 'opacity 0.3s ease-in-out',
              }}
            >
              {ROTATING_FEED_NAV_TEXTS[rotatingTextIndex]}
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div className="hidden flex-shrink-0 items-center gap-2 self-center md:flex lg:gap-3">
            <a
              href={getGoogleOAuthUrl('/feed')}
              className="inline-block flex-shrink-0 cursor-pointer rounded-full px-4 py-2 text-center text-sm font-semibold text-black transition-all duration-300 hover:scale-105 hover:shadow-lg"
              style={{
                fontFamily: 'Poppins, sans-serif',
                backgroundColor: '#73FFA2',
                boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset',
              }}
            >
              Únete a TANKU
            </a>
          </div>
        )}
      </div>

      {/* Buscador — móvil autenticado: categorías + carrito a la derecha del campo */}
      <div
        className={clsx(
          'px-2 sm:px-3 md:px-4 mb-0.5 pt-2 sm:pt-3 md:pt-4 transition-all duration-300 ease-out',
          compactMid && 'origin-top scale-[0.96] [will-change:transform]'
        )}
      >
        <div className="relative flex w-full flex-row items-center gap-2">
          {isAuthenticated && (
            <Link
              href="/feed"
              className="shrink-0 md:hidden"
              onClick={(e) => {
                if (pathname === '/feed' || pathname === '/') {
                  e.preventDefault()
                  window.dispatchEvent(new CustomEvent(FEED_RESET_FILTERS_EVENT))
                }
              }}
              aria-label="Ir al feed"
            >
              <Image
                src="/feed/logo-tanku.svg"
                alt="Tanku"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority={false}
                unoptimized
              />
            </Link>
          )}
          <div className="relative min-w-0 flex-1">
            <div className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2 transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 41 42"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M26.8334 8.76545L30.1099 22.6447L20.9442 31.156L8.1482 27.8382L4.84774 14.0188L14.8779 5.75197L26.8334 8.76545Z"
                  stroke="#B8C4CC"
                  strokeWidth="3"
                />
                <line
                  y1="-1.5"
                  x2="20.427"
                  y2="-1.5"
                  transform="matrix(0.709973 0.704229 -0.70423 0.709971 24.3841 27.5551)"
                  stroke="#B8C4CC"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar productos…"
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSearchCommit()
                }
              }}
              disabled={!isAuthenticated}
              className="tanku-pill-search-input w-full rounded-full border border-white/10 py-2 pl-10 pr-3 transition-all duration-200 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            />
          </div>
          {isAuthenticated && (
            <>
              <button
                type="button"
                className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/10 md:hidden"
                aria-label="Categorías"
                onClick={() => onOpenCategoriesModal?.()}
              >
                <Image
                  src="/icons_tanku/mobile_tanku_icono_nueva_historia.svg"
                  alt=""
                  width={22}
                  height={22}
                  className="h-[22px] w-[22px] object-contain"
                  unoptimized
                />
              </button>
              <Link href="/cart" className="flex shrink-0 items-center justify-center md:hidden" aria-label="Ir al carrito">
                <Image
                  src="/icons_tanku/tanku_nav_carrito_verde.svg"
                  alt=""
                  width={30}
                  height={30}
                  className="h-[30px] w-[30px] object-contain"
                  unoptimized
                />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

