/**
 * Componente base de navegación reutilizable
 * Incluye stories (opcional), botones de acción (cart, notifications, messages)
 */

'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { CartButton } from '@/components/layout/cart-button'
import { NotificationsButton } from '@/components/layout/notifications-button'
import { MessagesDropdown } from '@/components/layout/messages-dropdown'
import { useChat } from '@/lib/hooks/use-chat'
import { useChatService } from '@/lib/hooks/use-chat-service'
import { StoriesCarousel } from '@/components/stories/stories-carousel'
import { getGoogleOAuthUrl } from '@/lib/auth/google-oauth'

interface BaseNavProps {
  /** Si se muestra la sección de stories */
  showStories?: boolean
  /** Si el nav se puede esconder (solo para feed) */
  canHide?: boolean
  /** Si el nav está visible (para control de esconderse) */
  isVisible?: boolean
  /** Si se muestra el botón "Únete a Tanku" (solo para feed) */
  showJoinButton?: boolean
  /** Contenido adicional opcional (ej: buscador) */
  additionalContent?: React.ReactNode
  /** Título a la izquierda del nav (ej. página de eventos) */
  pageTitle?: string
  /** Subtítulo bajo el título (opcional) */
  pageSubtitle?: string
  /** Color del título (por defecto el verde Tanku de eventos) */
  pageTitleColor?: string
  /** Contenido a la izquierda del título (ej. botón volver) */
  startContent?: React.ReactNode
  /** Clase adicional para el contenedor */
  className?: string
  /** Historias personalizadas para pasar al StoriesCarousel */
  customStories?: import('@/lib/hooks/use-stories').StoryDTO[]
  /** Móvil (< md): nav translúcido con blur; desde md fondo opaco como siempre */
  mobileTranslucentNav?: boolean
  /** Móvil: botón volver + título centrado blanco + solo carrito */
  mobileBackCenterTitleCartOnly?: boolean
}

export function BaseNav({
  showStories = false,
  canHide = false,
  isVisible = true,
  showJoinButton = false,
  additionalContent,
  pageTitle,
  pageSubtitle,
  pageTitleColor = '#73FFA2',
  startContent,
  className = '',
  customStories,
  mobileTranslucentNav = false,
  mobileBackCenterTitleCartOnly = false,
}: BaseNavProps) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  // ✅ Obtener total de mensajes no leídos para badge
  const { getTotalUnreadCount, lastReceivedMessage, conversations } = useChat()
  // ✅ NUEVO: Usar ChatService en lugar de useSocket
  const { messages: chatServiceMessages } = useChatService()
  // Usar useMemo para recalcular cuando cambia lastReceivedMessage
  const totalUnread = React.useMemo(() => {
    return user ? getTotalUnreadCount(user.id) : 0
  }, [user, getTotalUnreadCount, lastReceivedMessage, chatServiceMessages, conversations])
  const [isMessagesDropdownOpen, setIsMessagesDropdownOpen] = useState(false)

  const handleOpenChat = (conversationId: string) => {
    // El dropdown ahora maneja el chat internamente, no necesitamos abrir ventanas flotantes
    // Esta función se mantiene por compatibilidad pero no hace nada
  }

  const showPageHeading = Boolean(pageTitle || pageSubtitle)

  const renderPageHeading = () =>
    showPageHeading ? (
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-2">
        {pageTitle ? (
          <h1
            className="min-w-0 truncate text-lg font-bold sm:text-xl md:text-2xl"
            style={{ color: pageTitleColor, fontFamily: 'Poppins, sans-serif' }}
          >
            {pageTitle}
          </h1>
        ) : null}
        {pageSubtitle ? (
          <p className="line-clamp-2 max-w-xl text-[10px] leading-snug text-gray-400 sm:text-xs md:text-sm">
            {pageSubtitle}
          </p>
        ) : null}
      </div>
    ) : null

  const renderActionIcons = () => (
    <div className="flex shrink-0 items-center gap-2 lg:gap-3">
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
            onOpenChat={handleOpenChat}
          />
        )}
      </div>
      <div className="flex h-8 w-8 items-center justify-center md:h-9 md:w-9 lg:h-10 lg:h-10">
        <NotificationsButton />
      </div>
      <div className="flex h-8 w-8 items-center justify-center md:h-9 md:w-9 lg:h-10 lg:h-10">
        <CartButton />
      </div>
    </div>
  )

  const navSurfaceClass = mobileTranslucentNav
    ? 'max-md:inset-x-0 max-md:border-b max-md:border-white/[0.07] max-md:bg-[rgba(25,30,35,0.62)] max-md:backdrop-blur-xl max-md:backdrop-saturate-150 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.35)] max-md:[-webkit-backdrop-filter:blur(20px)_saturate(1.1)] md:right-4 md:border-0 md:bg-[var(--color-surface-191e23-20)] md:shadow-lg md:backdrop-blur-none md:backdrop-saturate-100 md:[-webkit-backdrop-filter:none]'
    : 'shadow-lg'

  return (
    <div
      className={`fixed top-0 left-0 md:left-36 lg:left-[208px] z-50 flex-shrink-0 transition-all duration-150 ease-in-out ${
        canHide && !isVisible ? '-translate-y-full' : 'translate-y-0'
      } ${navSurfaceClass} ${className}`}
      style={{
        transform: canHide && !isVisible ? 'translateY(-100%)' : 'translateY(0)',
        willChange: 'transform',
        ...(mobileTranslucentNav
          ? {}
          : { right: '16px', backgroundColor: 'var(--color-surface-191e23-20)' }),
      }}
    >
      {/* Stories Section - Solo si showStories es true */}
      {showStories && (
        <>
          {showPageHeading ? (
            <div className="flex items-start justify-between gap-2 border-b border-gray-800/50 px-2 pb-2 pt-2 sm:px-3 sm:pt-3 md:px-4 md:pt-4">
              {renderPageHeading()}
              {renderActionIcons()}
            </div>
          ) : null}
          <div
            className={`px-2 sm:px-3 md:px-4 pb-0 flex flex-col md:flex-row justify-between items-center w-full gap-0.5 sm:gap-1 md:gap-1 ${
              showPageHeading ? 'pt-2' : 'pt-2 sm:pt-3 md:pt-4'
            }`}
          >
            <div className={`flex-1 min-w-0 flex items-center ${isAuthenticated ? 'justify-start' : 'justify-center'}`}>
              {isAuthenticated ? (
                <StoriesCarousel stories={customStories} />
              ) : (
                <div
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 'bold',
                    fontSize: '32px',
                    lineHeight: '80px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    width: '623px',
                    height: '34px',
                    background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'transparent',
                  }}
                >
                  Don't Give a Like, Give a TANKU
                </div>
              )}
            </div>

            {!showPageHeading ? (
              <div className="hidden md:flex gap-2 lg:gap-3 flex-shrink-0 items-center self-center">
                {renderActionIcons()}
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* Si no hay stories, mostrar solo los botones (y título de página opcional a la izquierda) */}
      {!showStories && (
        <>
          {mobileBackCenterTitleCartOnly ? (
            <div className="flex items-center justify-between px-3 py-2 md:hidden">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                aria-label="Volver"
              >
                <Image
                  src="/icons_tanku/mobile_tanku_menu_ir_atras_Universal.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                  unoptimized
                />
              </button>
              <h1
                className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-white"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {pageTitle || 'Mi perfil'}
              </h1>
              <Link href="/cart" className="flex h-9 w-9 items-center justify-center" aria-label="Ir al carrito">
                <Image
                  src="/icons_tanku/tanku_nav_carrito_verde.svg"
                  alt=""
                  width={30}
                  height={30}
                  className="h-[30px] w-[30px] object-contain"
                  unoptimized
                />
              </Link>
            </div>
          ) : null}
          <div
            className={`gap-2 p-2 pb-2 sm:p-3 md:p-4 md:pb-2 lg:gap-3 ${
              mobileBackCenterTitleCartOnly ? 'hidden md:flex' : 'flex'
            } ${showPageHeading ? 'min-w-0 items-start justify-between' : 'items-center justify-end'}`}
          >
            {showPageHeading ? (
              <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
                {startContent ? (
                  <div className="flex shrink-0 flex-col justify-start pt-0.5">{startContent}</div>
                ) : null}
                {renderPageHeading()}
              </div>
            ) : null}
            {renderActionIcons()}
          </div>
        </>
      )}

      {/* Contenido adicional (ej: buscador) */}
      {additionalContent && <div className="px-2 sm:px-3 md:px-4 pb-2">{additionalContent}</div>}
    </div>
  )
}
