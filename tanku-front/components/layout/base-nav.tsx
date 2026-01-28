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
}

export function BaseNav({
  showStories = false,
  canHide = false,
  isVisible = true,
  showJoinButton = false,
  additionalContent,
  className = '',
}: BaseNavProps) {
  const { isAuthenticated, user } = useAuthStore()
  // ✅ Obtener total de mensajes no leídos para badge
  const { getTotalUnreadCount, lastReceivedMessage } = useChat()
  const totalUnread = user ? getTotalUnreadCount(user.id) : 0
  const [isMessagesDropdownOpen, setIsMessagesDropdownOpen] = useState(false)

  const handleOpenChat = (conversationId: string) => {
    // El dropdown ahora maneja el chat internamente, no necesitamos abrir ventanas flotantes
    // Esta función se mantiene por compatibilidad pero no hace nada
  }

  return (
    <div
      className={`fixed top-0 left-0 lg:left-60 z-50 flex-shrink-0 shadow-lg transition-all duration-150 ease-in-out bg-[#1E1E1E] ${
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
        <div className="p-2 sm:p-3 md:p-4 pb-0 flex flex-col md:flex-row justify-between items-start w-full gap-2 sm:gap-3 md:gap-4">
          <div className="flex-1 min-w-0 md:mr-2 lg:mr-4">
            {/* Placeholder para stories - TODO: Implementar cuando tengamos stories */}
            <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto pb-0 snap-x snap-mandatory">
              {/* Stories se implementarán más adelante */}
            </div>
          </div>

          {/* Botón "Únete a Tanku" - Solo visible cuando no hay sesión y showJoinButton es true */}
          {showJoinButton && !isAuthenticated && (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/v1/auth/google`}
              className="bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-black font-semibold px-4 py-2 sm:px-5 sm:py-2.5 rounded-full hover:shadow-lg hover:shadow-[#66DEDB]/25 transition-all duration-300 hover:transform hover:scale-105 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 cursor-pointer inline-block text-center"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Únete a Tanku
            </a>
          )}

          {/* Right Icons */}
          <div className="hidden md:flex gap-2 lg:gap-3 flex-shrink-0 items-center">
            {/* Messages Icon */}
            <Link
              href="/messages"
              className="relative flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group"
            >
              <Image
                src="/feed/Icons/Chat_Green.png"
                alt="Mensajes"
                width={24}
                height={24}
                className="object-contain group-hover:hidden w-5 h-5 md:w-6 md:h-6"
                unoptimized
              />
              <Image
                src="/feed/Icons/Chat_Blue.png"
                alt="Mensajes"
                width={24}
                height={24}
                className="object-contain hidden group-hover:block w-5 h-5 md:w-6 md:h-6"
                unoptimized
              />
              {/* Badge azul Tanku de mensajes no leídos */}
              {totalUnread > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#66DEDB] rounded-full border-2 border-[#1E1E1E]"></div>
              )}
            </Link>

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
          {/* Messages Icon con Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMessagesDropdownOpen(!isMessagesDropdownOpen)}
              className="relative flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group"
            >
              <Image
                src="/feed/Icons/Chat_Green.png"
                alt="Mensajes"
                width={24}
                height={24}
                className="object-contain group-hover:hidden w-5 h-5 md:w-6 md:h-6"
                unoptimized
              />
              <Image
                src="/feed/Icons/Chat_Blue.png"
                alt="Mensajes"
                width={24}
                height={24}
                className="object-contain hidden group-hover:block w-5 h-5 md:w-6 md:h-6"
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

