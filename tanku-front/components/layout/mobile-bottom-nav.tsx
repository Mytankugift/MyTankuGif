'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { FEED_RESET_FILTERS_EVENT } from '@/lib/constants/feed-events'
import { CategoryLoginModal } from '@/components/feed/category-login-modal'
import { CreatePostModal } from '@/components/posters/create-post-modal'
import { EventsModal } from '@/components/events/events-modal'
import { MobileCenterActionMenu } from '@/components/layout/mobile-center-action-menu'

/**
 * Barra inferior móvil (< md). Vive fuera del Sidebar y se renderiza después de <main>
 * para que no quede tapada por el contenido (p. ej. /events con scroll propio).
 * z-index muy alto: debe seguir siendo clicable aunque haya modales/portales abiertos.
 */
export default function MobileBottomNav() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [centerMenuOpen, setCenterMenuOpen] = useState(false)
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false)
  const [eventsModalOpen, setEventsModalOpen] = useState(false)

  useEffect(() => {
    setCenterMenuOpen(false)
  }, [pathname])

  /** Landing sin sesión: solo botón circular central (sin barra translúcida). */
  const isLandingGuest = pathname === '/' && !isAuthenticated

  const isActiveRoute = (route: string) => {
    if (route === '/feed') {
      return pathname === '/feed' || pathname === '/'
    }
    return pathname === route || pathname.startsWith(route + '/')
  }

  const handleFeedLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/feed' || pathname === '/') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent(FEED_RESET_FILTERS_EVENT))
    }
  }

  return (
    <>
    <nav
      className={`pointer-events-auto md:hidden fixed z-[999999] ${
        isLandingGuest
          ? 'bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2'
          : 'bottom-0 left-0 right-0 flex items-center justify-around border-t border-white/[0.08] px-2 py-0.5 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150'
      }`}
      style={{
        WebkitBackdropFilter: isLandingGuest ? 'none' : 'blur(20px) saturate(1.1)',
        backgroundColor: isLandingGuest ? 'transparent' : 'rgba(38, 38, 38, 0.52)',
        minHeight: isLandingGuest ? undefined : '44px',
        paddingBottom: isLandingGuest ? undefined : 'max(6px, env(safe-area-inset-bottom))',
      }}
      aria-label="Navegación principal"
    >
      {!isLandingGuest && (
        <Link
          href="/feed"
          onClick={handleFeedLinkClick}
          className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all ${
            isActiveRoute('/feed') ? 'opacity-100' : 'opacity-50 hover:opacity-70'
          }`}
          style={{
            filter: isActiveRoute('/feed')
              ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))'
              : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))',
          }}
        >
          <img
            src="/icons_tanku/tanku_logo_menu_MyTanku_verde.svg"
            alt="My TANKU"
            className="h-7 w-auto"
          />
        </Link>
      )}

      {!isLandingGuest && (isAuthenticated ? (
        <Link
          href="/notifications"
          className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all ${
            isActiveRoute('/notifications') ? 'opacity-100' : 'opacity-50 hover:opacity-70'
          }`}
          style={{
            filter: isActiveRoute('/notifications')
              ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))'
              : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))',
          }}
        >
          <img
            src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
            alt="Notificaciones"
            className="h-7 w-auto"
          />
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-center p-1 rounded-lg opacity-30 cursor-not-allowed">
          <img
            src="/icons_tanku/tanku_nav_notificaciones_verde.svg"
            alt="Notificaciones"
            className="h-7 w-auto"
          />
        </div>
      ))}

      <button
        type="button"
        className={`h-[52px] w-[52px] rounded-full flex items-center justify-center transition-transform hover:scale-110 relative ${
          isLandingGuest ? '' : '-mt-4'
        }`}
        style={{
          background: 'rgba(78, 216, 124, .9)',
          border: '2px solid #73FFA2',
          boxShadow: '0 0 16px rgba(115, 255, 162, 0.8), 0 0 24px rgba(115, 255, 162, 0.6)',
        }}
        title={isAuthenticated ? '¿Qué quieres hacer hoy?' : 'Inicia sesión para continuar'}
        aria-label={isAuthenticated ? 'Abrir menú de acciones' : 'Inicia sesión para continuar'}
        aria-expanded={isAuthenticated ? centerMenuOpen : undefined}
        onClick={() => {
          if (!isAuthenticated) {
            setShowLoginModal(true)
          } else {
            setCenterMenuOpen((open) => !open)
          }
        }}
      >
        <span className="text-white text-5xl leading-none font-light">+</span>
      </button>

      {!isLandingGuest && (isAuthenticated ? (
        <Link
          href="/messages"
          className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all ${
            isActiveRoute('/messages') ? 'opacity-100' : 'opacity-50 hover:opacity-70'
          }`}
          style={{
            filter: isActiveRoute('/messages')
              ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))'
              : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))',
          }}
        >
          <img
            src="/icons_tanku/tanku_nav_mensajes_verde.svg"
            alt="Mensajes"
            className="h-7 w-auto"
          />
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-center p-1 rounded-lg opacity-30 cursor-not-allowed">
          <img
            src="/icons_tanku/tanku_nav_mensajes_verde.svg"
            alt="Mensajes"
            className="h-7 w-auto"
          />
        </div>
      ))}

      {!isLandingGuest && (isAuthenticated ? (
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all ${
            isActiveRoute('/profile') ? 'opacity-100' : 'opacity-50 hover:opacity-70'
          }`}
          style={{
            filter: isActiveRoute('/profile')
              ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))'
              : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))',
          }}
        >
          <img
            src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
            alt="Mi Perfil"
            className="h-7 w-auto"
          />
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-center p-1 rounded-lg opacity-30 cursor-not-allowed">
          <img
            src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
            alt="Mi Perfil"
            className="h-7 w-auto"
          />
        </div>
      ))}

      <CategoryLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => setShowLoginModal(false)}
      />
    </nav>

    <MobileCenterActionMenu
      isOpen={Boolean(isAuthenticated && centerMenuOpen)}
      onClose={() => setCenterMenuOpen(false)}
      onNuevoPost={() => setCreatePostModalOpen(true)}
      onOpenEvents={() => {
        setCenterMenuOpen(false)
        setEventsModalOpen(true)
      }}
    />
    <EventsModal isOpen={eventsModalOpen} onClose={() => setEventsModalOpen(false)} />
    <CreatePostModal
      isOpen={Boolean(isAuthenticated && createPostModalOpen)}
      onClose={() => setCreatePostModalOpen(false)}
      onPostCreated={() => setCreatePostModalOpen(false)}
    />
    </>
  )
}
