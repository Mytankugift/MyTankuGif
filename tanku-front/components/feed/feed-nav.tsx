'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { CartButton } from '@/components/layout/cart-button'
import { NotificationsButton } from '@/components/layout/notifications-button'
import { MessagesDropdown } from '@/components/layout/messages-dropdown'
import { useChat } from '@/lib/hooks/use-chat'

// Componente CategorySelector
const CategorySelector = ({
  categories,
  selectedCategoryId,
  onCategoryChange,
}: {
  categories: { id: string | number; name: string; image?: string | null }[]
  selectedCategoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseDown={(e) => e.preventDefault()}
        className="px-2 py-1.5 bg-transparent text-white rounded-lg focus:outline-none focus:ring-0 active:outline-none transition-all duration-200 flex items-center justify-between cursor-pointer gap-2"
      >
        <span
          className="text-[#73FFA2] font-medium text-sm sm:text-base md:text-lg"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Categorías
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="12"
          viewBox="0 0 30 14"
          fill="none"
          className={`transition-transform duration-200 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <line
            y1="-2.5"
            x2="18.093"
            y2="-2.5"
            transform="matrix(-0.829163 0.559007 0.71276 0.701408 30 3.5087)"
            stroke="#73FFA2"
            strokeWidth="5"
          />
          <line
            y1="-2.5"
            x2="18.0922"
            y2="-2.5"
            transform="matrix(-0.829084 -0.559124 -0.712868 0.701299 15 13.6223)"
            stroke="#73FFA2"
            strokeWidth="5"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 bg-gray-800 border-2 border-[#73FFA2] rounded-2xl shadow-2xl z-50 p-2 sm:p-4 w-[calc(100vw-2rem)] sm:min-w-[400px] sm:max-w-[600px] md:min-w-[600px] md:max-w-[800px]">
          <div className="mb-3 relative">
            <input
              type="text"
              placeholder="Buscar categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border-2 border-gray-600 focus:border-[#73FFA2] focus:outline-none transition-all duration-200"
              style={{ fontFamily: 'Poppins, sans-serif' }}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              onCategoryChange(null)
              setIsOpen(false)
              setSearchQuery('')
            }}
            className={`w-full mb-3 px-3 py-2 rounded-lg transition-all duration-200 text-left ${
              selectedCategoryId === null
                ? 'bg-[#73FFA2]/20 border-2 border-[#73FFA2]'
                : 'bg-gray-700/50 border-2 border-transparent hover:bg-gray-700 hover:border-[#73FFA2]/50'
            }`}
          >
            <span
              className="text-[#66DEDB] font-medium text-sm"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Todas las categorías
            </span>
          </button>

          {searchQuery && filteredCategories.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              No se encontraron categorías con "{searchQuery}"
            </div>
          )}

          {filteredCategories.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2 max-h-[400px] overflow-y-auto">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategoryChange(String(category.id))
                    setIsOpen(false)
                    setSearchQuery('')
                  }}
                  className={`px-3 py-2 rounded-lg transition-all duration-200 border-2 ${
                    selectedCategoryId === String(category.id)
                      ? 'bg-[#73FFA2]/30 border-[#73FFA2] shadow-lg shadow-[#73FFA2]/30'
                      : 'bg-gray-700/30 border-transparent hover:bg-gray-700/50 hover:border-[#73FFA2]/30'
                  }`}
                >
                  <span
                    className={`text-xs font-medium text-center block line-clamp-2 ${
                      selectedCategoryId === String(category.id)
                        ? 'text-[#73FFA2]'
                        : 'text-gray-300'
                    }`}
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Componente FilterSelector
const FilterSelector = () => {
  const [isOpen, setIsOpen] = useState(false)
  const filters = [
    { id: 'personas', label: 'Personas' },
    { id: 'marcas', label: 'Marcas' },
    { id: 'productos', label: 'Productos' },
    { id: 'servicios', label: 'Servicios' },
  ]
  const [selectedFilters, setSelectedFilters] = useState<string[]>(
    filters.map((f) => f.label)
  )
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-[#73FFA2]/20 transition-all duration-200 flex items-center justify-center cursor-pointer p-0"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="48"
          viewBox="0 0 71 48"
          fill="none"
          className="h-6 w-auto sm:h-8 md:h-10 lg:h-12"
        >
          <line x1="16" y1="29.5" x2="56" y2="29.5" stroke="#73FFA2" strokeWidth="3" />
          <rect
            x="1.5"
            y="1.5"
            width="68"
            height="45"
            rx="22.5"
            stroke="#73FFA2"
            strokeWidth="3"
          />
          <line x1="16" y1="17.5" x2="56" y2="17.5" stroke="#73FFA2" strokeWidth="3" />
          <circle cx="44" cy="17" r="5" fill="#73FFA2" />
          <circle cx="28" cy="30" r="5" fill="#73FFA2" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-gray-800 border border-[#73FFA2] rounded-2xl shadow-xl z-10 overflow-hidden whitespace-nowrap min-w-fit">
          {filters.map((filter) => {
            const isSelected = selectedFilters.includes(filter.label)
            return (
              <button
                key={filter.id}
                onClick={() => {
                  setSelectedFilters((prev) =>
                    isSelected
                      ? prev.filter((f) => f !== filter.label)
                      : [...prev, filter.label]
                  )
                }}
                className="w-full px-4 py-1 flex items-center gap-3 hover:bg-gray-700 transition-colors duration-200 text-left"
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#66DEDB] flex items-center justify-center bg-transparent">
                      <div className="w-3 h-3 rounded-full bg-[#66DEDB]"></div>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-500"></div>
                  )}
                </div>
                <span className="text-[#66DEDB] font-medium">{filter.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface FeedNavProps {
  categories?: { id: string | number; name: string; image?: string | null }[]
  selectedCategoryId?: string | null
  onCategoryChange?: (categoryId: string | null) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  isHeaderVisible?: boolean
}

export function FeedNav({
  categories = [],
  selectedCategoryId = null,
  onCategoryChange = () => {},
  searchQuery = '',
  onSearchChange = () => {},
  isHeaderVisible = true,
}: FeedNavProps) {
  const { user, isAuthenticated } = useAuthStore()
  const [isLightMode, setIsLightMode] = useState(false)
  const [isMessagesDropdownOpen, setIsMessagesDropdownOpen] = useState(false)
  // ✅ Obtener total de mensajes no leídos para badge
  const { getTotalUnreadCount, lastReceivedMessage } = useChat()
  const totalUnread = user ? getTotalUnreadCount(user.id) : 0

  const handleOpenChat = (conversationId: string) => {
    // El dropdown ahora maneja el chat internamente, no necesitamos abrir ventanas flotantes
    // Esta función se mantiene por compatibilidad pero no hace nada
  }

  return (
    <div
      className={`fixed top-0 left-0 lg:left-60 z-40 flex-shrink-0 shadow-lg transition-all duration-150 ease-in-out ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      } ${isLightMode ? 'bg-white' : 'bg-[#1E1E1E]'}`}
      style={{
        transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
        willChange: 'transform',
        right: '16px', // Aumentado de 8px a 16px para dejar espacio a la barra de scroll
      }}
    >
      {/* Stories Section - TODO: Implementar cuando tengamos stories */}
      <div className="p-2 sm:p-3 md:p-4 pb-0 flex flex-col md:flex-row justify-between items-start w-full gap-2 sm:gap-3 md:gap-4">
        <div className="flex-1 min-w-0 md:mr-2 lg:mr-4">
          {/* Placeholder para stories */}
          <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto pb-0 snap-x snap-mandatory">
            {/* Stories se implementarán más adelante */}
          </div>
        </div>

        {/* Botón "Únete a Tanku" - Solo visible cuando no hay sesión */}
        {!isAuthenticated && (
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
          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer"
            title={isLightMode ? 'Modo oscuro' : 'Modo claro'}
          >
            {isLightMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#73FFA2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#73FFA2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>

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
                style={{ width: 'auto', height: 'auto' }}
              />
              <Image
                src="/feed/Icons/Chat_Blue.png"
                alt="Mensajes"
                width={24}
                height={24}
                className="object-contain hidden group-hover:block w-5 h-5 md:w-6 md:h-6"
                style={{ width: 'auto', height: 'auto' }}
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

      {/* Buscador */}
      <div className="px-2 sm:px-3 md:px-4 mb-1 pt-0">
        <div className="relative w-full">
          <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 z-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 41 42"
              fill="none"
              className="w-5 h-5"
            >
              <path
                d="M26.8334 8.76545L30.1099 22.6447L20.9442 31.156L8.1482 27.8382L4.84774 14.0188L14.8779 5.75197L26.8334 8.76545Z"
                stroke="#262626"
                strokeWidth="3"
              />
              <line
                y1="-1.5"
                x2="20.427"
                y2="-1.5"
                transform="matrix(0.709973 0.704229 -0.70423 0.709971 24.3841 27.5551)"
                stroke="#262626"
                strokeWidth="3"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                // TODO: Implementar búsqueda
              }
            }}
            className="w-full pl-10 pr-3 py-2 text-sm bg-white text-black rounded-full border border-gray-300 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20 transition-all duration-200"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          />
        </div>
      </div>

      {/* Selector de categorías, filtros y botones de categorías */}
      {categories.length > 0 && (
        <div className="px-2 sm:px-3 md:px-4 mb-1 pt-1">
          <div className="flex items-center gap-3 w-full">
            {/* Desplegable de categorías */}
            <CategorySelector
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={onCategoryChange}
            />

            {/* Botones de categorías con imagen y nombre (scrollable) */}
            <div className="relative flex-1 min-w-0">
              {/* Flecha izquierda */}
              <button
                onClick={() => {
                  const container = document.getElementById('categories-scroll')
                  if (container) {
                    container.scrollBy({ left: -200, behavior: 'smooth' })
                  }
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700 rounded-full p-1 transition-all duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="40"
                  viewBox="0 0 17 40"
                  fill="none"
                  className="w-4 h-10"
                >
                  <line
                    y1="-2.5"
                    x2="24.1241"
                    y2="-2.5"
                    transform="matrix(-0.55901 0.829161 -0.701411 -0.712757 13.4858 0)"
                    stroke="#3B9BC3"
                    strokeWidth="5"
                  />
                  <line
                    y1="-2.5"
                    x2="24.1231"
                    y2="-2.5"
                    transform="matrix(0.559128 0.829082 -0.701302 0.712865 0.000488281 20)"
                    stroke="#3B9BC3"
                    strokeWidth="5"
                  />
                </svg>
              </button>

              {/* Contenedor scrollable */}
              <div
                id="categories-scroll"
                className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 ml-8 mr-8 scrollbar-hide scroll-smooth"
              >
                {/* Botón "Todas" al inicio */}
                <button
                  key="all-categories"
                  data-category-id="all"
                  onClick={() => onCategoryChange(null)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all duration-300 border-2 min-w-[80px] sm:min-w-[100px] ${
                    selectedCategoryId === null
                      ? 'bg-gradient-to-r from-[#73FFA2] to-[#66DEDB] border-[#73FFA2] shadow-lg shadow-[#73FFA2]/30 scale-105'
                      : 'bg-gray-700/50 border-transparent hover:bg-gray-700 hover:border-[#73FFA2]/30 hover:scale-105'
                  }`}
                >
                  <span
                    className={`text-xs sm:text-sm font-semibold text-center line-clamp-2 ${
                      selectedCategoryId === null ? 'text-black' : 'text-white'
                    }`}
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    Todas
                  </span>
                </button>

                {categories.map((c, index) => {
                  const category = {
                    id: c.id,
                    name: c.name,
                    image: c.image || null, // Usar imagen del backend o null
                    url: `/${c.name.toLowerCase().replace(/\s+/g, '-')}`,
                  }
                  const vibrantColors = [
                    'bg-gradient-to-r from-pink-500 to-rose-500',
                    'bg-gradient-to-r from-purple-500 to-indigo-500',
                    'bg-gradient-to-r from-blue-500 to-cyan-500',
                    'bg-gradient-to-r from-green-500 to-emerald-500',
                    'bg-gradient-to-r from-yellow-500 to-orange-500',
                    'bg-gradient-to-r from-red-500 to-pink-500',
                    'bg-gradient-to-r from-indigo-500 to-purple-500',
                    'bg-gradient-to-r from-cyan-500 to-blue-500',
                    'bg-gradient-to-r from-emerald-500 to-teal-500',
                    'bg-gradient-to-r from-orange-500 to-red-500',
                    'bg-gradient-to-r from-violet-500 to-purple-500',
                    'bg-gradient-to-r from-teal-500 to-cyan-500',
                    'bg-gradient-to-r from-amber-500 to-yellow-500',
                    'bg-gradient-to-r from-fuchsia-500 to-pink-500',
                    'bg-gradient-to-r from-sky-500 to-blue-500',
                    'bg-gradient-to-r from-lime-500 to-green-500',
                  ]
                  const colorClass = vibrantColors[index % vibrantColors.length]
                  const isSelected = selectedCategoryId === String(category.id)

                  return (
                    <button
                      key={category.id}
                      data-category-id={String(category.id)}
                      onClick={() => onCategoryChange(String(category.id))}
                      className="flex-shrink-0 snap-start cursor-pointer group"
                    >
                      <div
                        className={`flex items-center h-8 sm:h-9 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                          isSelected
                            ? 'border-[#73FFA2] scale-105 shadow-lg shadow-[#73FFA2]/50'
                            : 'border-gray-600 group-hover:border-[#73FFA2]'
                        } ${colorClass}`}
                      >
                        {/* Imagen a la izquierda */}
                        {category.image ? (
                          <div className="relative w-8 sm:w-9 h-full flex-shrink-0">
                            <Image
                              src={category.image}
                              alt={category.name}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                // Si la imagen falla, ocultarla
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        ) : (
                          <div className="relative w-8 sm:w-9 h-full flex-shrink-0 bg-gray-600" />
                        )}
                        {/* Nombre a la derecha */}
                        <div className="flex items-center px-2 sm:px-3 flex-1 min-w-0">
                          <span
                            className={`text-xs sm:text-sm font-bold leading-tight whitespace-nowrap drop-shadow-md ${
                              isSelected ? 'text-[#73FFA2]' : 'text-white'
                            }`}
                          >
                            {category.name}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Flecha derecha */}
              <button
                onClick={() => {
                  const container = document.getElementById('categories-scroll')
                  if (container) {
                    container.scrollBy({ left: 200, behavior: 'smooth' })
                  }
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700 rounded-full p-1 transition-all duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="40"
                  viewBox="0 0 17 40"
                  fill="none"
                  className="w-4 h-10"
                >
                  <line
                    y1="-2.5"
                    x2="24.1241"
                    y2="-2.5"
                    transform="matrix(0.55901 0.829161 0.701411 -0.712757 3.50879 0)"
                    stroke="#3B9BC3"
                    strokeWidth="5"
                  />
                  <line
                    y1="-2.5"
                    x2="24.1231"
                    y2="-2.5"
                    transform="matrix(-0.559128 0.829082 0.701302 0.712865 16.9941 20)"
                    stroke="#3B9BC3"
                    strokeWidth="5"
                  />
                </svg>
              </button>
            </div>

            {/* Selector de filtros */}
            <FilterSelector />
          </div>
        </div>
      )}
    </div>
  )
}

