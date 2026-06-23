'use client'

import React, { useState, useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { NavActionIcons } from '@/components/layout/nav-action-icons'
import { CartButton } from '@/components/layout/cart-button'
import { FeedStoriesStrip, FRIENDS_SUGGESTIONS_HREF } from '@/components/feed/feed-stories-strip'
import type { FeedCategoryActivePillCategory } from '@/components/feed/feed-category-active-pill'
import { FEED_RESET_FILTERS_EVENT } from '@/lib/constants/feed-events'
import type { FeedNavScrollState } from '@/lib/hooks/use-feed-scroll-nav'
import { clsx } from 'clsx'
import { getGoogleOAuthUrl } from '@/lib/auth/google-oauth'

/** Misma altura de la franja superior que `BaseNav` (perfil, mensajes, carrito, etc.). */
const FEED_NAV_TOP_CHROME_ROW =
  'min-h-[52px] items-center gap-2 p-2 pb-2 sm:p-3 md:p-4 md:pb-2 lg:gap-3'

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
  /** Texto del input (p. ej. personas en /friends) */
  searchPlaceholder?: string
  /** Contenido bajo el input (p. ej. autocompletado en /friends); el contenedor tiene `position: relative`. */
  searchDropdownSlot?: ReactNode
  onSearchFocus?: () => void
  onSearchBlur?: () => void
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
  searchPlaceholder = 'Buscar productos…',
  searchDropdownSlot,
  onSearchFocus,
  onSearchBlur,
}: FeedNavProps) {
  const searchBlurDeferRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (searchBlurDeferRef.current) clearTimeout(searchBlurDeferRef.current)
    }
  }, [])

  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()
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

  const { showStoriesStrip, compactMid } = feedNavScroll
  /** Historias visibles en el nav fijo (desktop): al ocultarse, el buscador sube. */
  const fixedStoriesVisible =
    showStoriesStripInFixedNav && !activeCategoryFilter && showStoriesStrip

  return (
    <div className="w-full bg-transparent">
      {/* Stories Section */}
      <div
        className={clsx(
          'flex w-full flex-col pb-0 md:flex-row md:items-center md:justify-between',
          'px-2 pt-2 sm:px-3 sm:pt-3 md:px-0',
          'gap-0.5 sm:gap-1 md:gap-1',
          !isAuthenticated && FEED_NAV_TOP_CHROME_ROW,
          isAuthenticated && 'md:pt-0',
        )}
      >
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
          <div
            className={clsx(
              'flex w-full flex-col transition-[gap] duration-300 ease-out',
              fixedStoriesVisible ? 'gap-2 sm:gap-2.5' : 'gap-0',
            )}
          >
            {/* Tablet/desktop: mismo layout que BaseNav (título centrado + iconos en flujo, no absolute right-0) */}
            <div
              className={clsx(
                'relative hidden w-full items-center justify-between md:flex',
                FEED_NAV_TOP_CHROME_ROW,
              )}
            >
              <span className="inline-block w-10 shrink-0 sm:w-11" aria-hidden />
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-[min(56vw,28rem)] -translate-x-1/2 -translate-y-1/2 text-center transition-opacity duration-300 ease-in-out"
                style={{ opacity: textOpacity }}
              >
                <span
                  className="hidden md:inline lg:hidden"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    lineHeight: '1.2',
                    background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ROTATING_FEED_NAV_TEXTS[rotatingTextIndex]}
                </span>
                <span
                  className="hidden lg:inline"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 'bold',
                    fontSize: '26px',
                    lineHeight: '1.2',
                    background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ROTATING_FEED_NAV_TEXTS[rotatingTextIndex]}
                </span>
              </div>
              <div className="flex shrink-0 items-center">
                <NavActionIcons
                  unreadCount={propUnreadCount}
                  initialNotifications={propNotifications}
                  initialUnreadCount={propNotificationsUnreadCount}
                />
              </div>
            </div>

            {/* Historias + Explorar, o pastilla (solo tablet/desktop; en móvil va en el scroll del feed) */}
            {showStoriesStripInFixedNav && !activeCategoryFilter && (
              <div className="hidden w-full md:block">
                <FeedStoriesStrip
                  showStoriesStrip={showStoriesStrip}
                  stories={propStories}
                  feedExplorarActivated={feedExplorarActivated}
                  onExplorarActivated={onFeedExplorarActivated}
                  friendsSuggestionsHref={FRIENDS_SUGGESTIONS_HREF}
                />
              </div>
            )}
          </div>
        )}

        {!isAuthenticated && (
          <div className="hidden min-w-0 flex-1 items-center justify-center md:flex lg:hidden">
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 'bold',
                fontSize: '20px',
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
          <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 'bold',
                fontSize: '26px',
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
          <div className="hidden shrink-0 items-center gap-2 self-center md:flex lg:gap-3">
            <NavActionIcons showJoinButton />
          </div>
        )}
      </div>

      {/* Buscador — móvil autenticado: categorías + carrito a la derecha del campo */}
      <div
        className={clsx(
          'mb-0.5 px-2 transition-all duration-300 ease-out sm:px-3 md:px-4',
          fixedStoriesVisible
            ? 'pt-2 sm:pt-3 md:pt-4'
            : 'pt-1.5 sm:pt-2 md:pt-1 md:-mt-0.5',
          compactMid && 'origin-top scale-[0.96] [will-change:transform]',
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
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onFocus={() => {
                if (searchBlurDeferRef.current) {
                  clearTimeout(searchBlurDeferRef.current)
                  searchBlurDeferRef.current = null
                }
                onSearchFocus?.()
              }}
              onBlur={() => {
                searchBlurDeferRef.current = setTimeout(() => {
                  searchBlurDeferRef.current = null
                  onSearchBlur?.()
                }, 220)
              }}
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
            {searchDropdownSlot}
          </div>
          {isAuthenticated && (
            <>
              {onOpenCategoriesModal ? (
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/10 md:hidden"
                  aria-label="Categorías"
                  onClick={() => onOpenCategoriesModal()}
                >
                  <img
                    src="/icons_tanku/mobile_tanku_icono_nueva_historia.svg"
                    alt=""
                    className="h-[22px] w-auto"
                  />
                </button>
              ) : null}
              <div className="flex shrink-0 items-center justify-center md:hidden">
                <CartButton compact />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

