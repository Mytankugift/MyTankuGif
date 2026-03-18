/**
 * Componente base de navegación reutilizable
 * Incluye stories (opcional), botones de acción (cart, notifications, messages)
 */

'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { CartButton } from '@/components/layout/cart-button'
import { NotificationsButton } from '@/components/layout/notifications-button'
import { MessagesDropdown } from '@/components/layout/messages-dropdown'
import { useChat } from '@/lib/hooks/use-chat'
import { useChatService } from '@/lib/hooks/use-chat-service'
import { StoriesCarousel } from '@/components/stories/stories-carousel'

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
  /** Clase adicional para el contenedor */
  className?: string
  /** Historias personalizadas para pasar al StoriesCarousel */
  customStories?: import('@/lib/hooks/use-stories').StoryDTO[]
}

export function BaseNav({
  showStories = false,
  canHide = false,
  isVisible = true,
  showJoinButton = false,
  additionalContent,
  className = '',
  customStories,
}: BaseNavProps) {
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

  return (
    <div
      className={`fixed top-0 left-0 md:left-36 lg:left-60 z-50 flex-shrink-0 shadow-lg transition-all duration-150 ease-in-out bg-[#1E1E1E] ${
        canHide && !isVisible ? '-translate-y-full' : 'translate-y-0'
      } ${className}`}
      style={{
        transform: canHide && !isVisible ? 'translateY(-100%)' : 'translateY(0)',
        willChange: 'transform',
        right: '16px',
      }}
    >
      {/* Stories Section - Solo si showStories es true */}
      {showStories && (
        <div className="px-2 sm:px-3 md:px-4 pt-2 sm:pt-3 md:pt-4 pb-0 flex flex-col md:flex-row justify-between items-center w-full gap-0.5 sm:gap-1 md:gap-1">
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

          {/* Right Icons - Centrados verticalmente entre stories y buscador */}
          <div className="hidden md:flex gap-2 lg:gap-3 flex-shrink-0 items-center self-center">
            {/* Botón "Únete a Tanku" - Solo visible cuando no hay sesión y showJoinButton es true */}
            {showJoinButton && !isAuthenticated && (
              <Link
                href="/auth/login"
                className="text-black font-semibold px-4 py-2 sm:px-5 sm:py-2.5 rounded-full hover:shadow-lg transition-all duration-300 hover:transform hover:scale-105 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 cursor-pointer inline-block text-center"
                style={{ 
                  fontFamily: 'Poppins, sans-serif',
                  backgroundColor: '#73FFA2',
                  boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset'
                }}
              >
                Únete a TANKU
              </Link>
            )}
            {/* Messages Icon con Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsMessagesDropdownOpen(!isMessagesDropdownOpen)}
                className="relative flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group"
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
                {/* Badge azul Tanku de mensajes no leídos */}
                {totalUnread > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#66DEDB] rounded-full border-2 border-[#1E1E1E]"></div>
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

            {/* Notifications */}
            <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10">
              <NotificationsButton />
            </div>

            {/* Cart Icon */}
            <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10">
              <CartButton />
            </div>
          </div>
        </div>
      )}

      {/* Si no hay stories, mostrar solo los botones */}
      {!showStories && (
        <div className="p-2 sm:p-3 md:p-4 pb-2 flex justify-end items-center gap-2 lg:gap-3">
          {/* Botón "Únete a Tanku" - Solo visible cuando no hay sesión y showJoinButton es true */}
          {showJoinButton && !isAuthenticated && (
            <Link
              href="/auth/login"
              className="text-black font-semibold px-4 py-2 sm:px-5 sm:py-2.5 rounded-full hover:shadow-lg transition-all duration-300 hover:transform hover:scale-105 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 cursor-pointer inline-block text-center"
              style={{ 
                fontFamily: 'Poppins, sans-serif',
                backgroundColor: '#73FFA2',
                boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset'
              }}
            >
              Únete a TANKU
            </Link>
          )}
          {/* Messages Icon con Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMessagesDropdownOpen(!isMessagesDropdownOpen)}
              className="relative flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group"
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
              {/* Badge azul Tanku de mensajes no leídos */}
              {totalUnread > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#66DEDB] rounded-full border-2 border-[#1E1E1E]"></div>
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

          {/* Notifications */}
          <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10">
            <NotificationsButton />
          </div>

          {/* Cart Icon */}
          <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10">
            <CartButton />
          </div>
        </div>
      )}

      {/* Contenido adicional (ej: buscador) */}
      {additionalContent && <div className="px-2 sm:px-3 md:px-4 pb-2">{additionalContent}</div>}
    </div>
  )
}

