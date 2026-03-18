'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CategoryLoginModal } from './category-login-modal'

// Componente CategorySelector (mismo que en feed-nav pero simplificado)
const CategorySelector = ({
  categories,
  selectedCategoryId,
  onCategoryChange,
  onShowLoginModal,
}: {
  categories: { id: string | number; name: string; image?: string | null }[]
  selectedCategoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
  onShowLoginModal?: () => void
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
        <div 
          className="absolute top-full left-0 mt-3 bg-gray-800 border border-[#73FFA2] shadow-2xl z-50"
          style={{
            width: 'max(320px, min(569px, 90vw))',
            maxHeight: '524px',
            gap: '16px',
            padding: '20px',
            borderRadius: '25px',
            borderWidth: '1px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="relative" style={{ marginBottom: '16px' }}>
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
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
              placeholder="Buscar categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-white focus:outline-none transition-all duration-200 w-full"
              style={{ 
                fontFamily: 'Poppins, sans-serif',
                height: '40px',
                paddingRight: '16px',
                paddingLeft: '48px',
                gap: '12px',
                borderRadius: '55px',
                backgroundColor: '#66DEDB',
                border: 'none',
              }}
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

          {searchQuery && filteredCategories.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              No se encontraron categorías con "{searchQuery}"
            </div>
          )}

          {(filteredCategories.length > 0 || !searchQuery) && (
            <div 
              className="grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto custom-scrollbar"
              style={{ maxHeight: '400px' }}
            >
              {/* Botón "Todas" */}
              <button
                onClick={() => {
                  onCategoryChange(null)
                  setIsOpen(false)
                  setSearchQuery('')
                }}
                className="transition-all duration-200 text-center"
                style={{
                  width: '100%',
                  height: '35px',
                  borderRadius: '20px',
                  backgroundColor: selectedCategoryId === null ? '#66DEDB' : '#3B9BC399',
                  color: selectedCategoryId === null ? '#3B9BC3' : '#66DEDB',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Todas
              </button>
              
              {filteredCategories.map((category) => {
                const isSelected = selectedCategoryId === String(category.id)
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      // En landing, todas las categorías requieren login (excepto "Todas")
                      if (onShowLoginModal) {
                        onShowLoginModal()
                      }
                      setIsOpen(false)
                    }}
                    className="transition-all duration-200 text-center"
                    style={{
                      width: '100%',
                      height: '35px',
                      borderRadius: '20px',
                      backgroundColor: isSelected ? '#66DEDB' : '#3B9BC399',
                      color: isSelected ? '#3B9BC3' : '#66DEDB',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="line-clamp-1">
                      {category.name}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface LandingNavProps {
  categories?: { id: string | number; name: string; image?: string | null }[]
  selectedCategoryId?: string | null
  onCategoryChange?: (categoryId: string | null) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  isHeaderVisible?: boolean
}

export function LandingNav({
  categories = [],
  selectedCategoryId = null,
  onCategoryChange = () => {},
  searchQuery = '',
  onSearchChange = () => {},
  isHeaderVisible = true,
}: LandingNavProps) {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [rotatingTextIndex, setRotatingTextIndex] = useState(0)
  const [textOpacity, setTextOpacity] = useState(1)

  const rotatingTexts = [
    "Don't Give a Like, Give a TANKU",
    "Bienvenido al primer GivE-Commerce del mundo",
    "Conecta con lo que te hace feliz"
  ]

  // Rotación de textos cada 15 segundos con desvanecimiento
  useEffect(() => {
    const interval = setInterval(() => {
      // Desvanecer
      setTextOpacity(0)
      setTimeout(() => {
        // Cambiar texto
        setRotatingTextIndex((prev) => (prev + 1) % rotatingTexts.length)
        // Aparecer
        setTextOpacity(1)
      }, 300) // 300ms para la transición
    }, 15000) // 15 segundos

    return () => clearInterval(interval)
  }, [rotatingTexts.length])

  const handleCategoryChange = (categoryId: string | null) => {
    if (categoryId !== null) {
      // Mostrar modal si se selecciona una categoría (no "Todas")
      setShowLoginModal(true)
    } else {
      onCategoryChange(categoryId)
    }
  }

  // Hacer scroll automático a la categoría seleccionada en el slider
  useEffect(() => {
    if (selectedCategoryId === null) {
      const container = document.getElementById('categories-scroll')
      if (container) {
        container.scrollTo({ left: 0, behavior: 'smooth' })
      }
    } else {
      const categoryButton = document.querySelector(
        `[data-category-id="${selectedCategoryId}"]`
      ) as HTMLElement
      if (categoryButton) {
        const container = document.getElementById('categories-scroll')
        if (container) {
          const buttonLeft = categoryButton.offsetLeft
          const buttonWidth = categoryButton.offsetWidth
          const containerWidth = container.offsetWidth
          
          const targetScroll = buttonLeft - (containerWidth / 2) + (buttonWidth / 2)
          
          container.scrollTo({
            left: targetScroll,
            behavior: 'smooth',
          })
        }
      }
    }
  }, [selectedCategoryId])

  return (
    <div
      className={`fixed top-0 left-0 md:left-36 lg:left-60 z-40 flex-shrink-0 shadow-lg transition-all duration-150 ease-in-out ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      } bg-[#1E1E1E]`}
      style={{
        transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
        willChange: 'transform',
        right: '16px',
      }}
    >
      {/* Header con Logo, Texto y Botón */}
      <div className="px-2 sm:px-3 md:px-4 pt-2 sm:pt-3 md:pt-4 pb-0 flex flex-col md:flex-row justify-between items-center w-full gap-0.5 sm:gap-1 md:gap-1">
        {/* Layout móvil: Logo fijo a la izquierda, Texto y Botón apilados verticalmente */}
        <div className="md:hidden w-full flex items-start gap-3 mb-2">
          {/* Logo Tanku a la izquierda - fijo */}
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
          {/* Contenedor con Texto y Botón apilados verticalmente */}
          <div className="flex-1 min-w-0 flex flex-col gap-2 items-center justify-center">
            {/* Texto */}
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 'bold',
                fontSize: 'clamp(14px, 4vw, 20px)',
                lineHeight: '1.3',
                background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
                marginTop: '8px',
                textAlign: 'center',
                opacity: textOpacity,
                transition: 'opacity 0.3s ease-in-out',
              }}
            >
              {rotatingTexts[rotatingTextIndex]}
            </div>
            {/* Botón Únete a Tanku */}
            <div className="flex-shrink-0">
              <Link
                href="/auth/login"
                className="text-black font-semibold px-3 py-1.5 rounded-full hover:shadow-lg transition-all duration-300 hover:transform hover:scale-105 text-xs whitespace-nowrap flex-shrink-0 cursor-pointer inline-block text-center"
                style={{ 
                  fontFamily: 'Poppins, sans-serif',
                  backgroundColor: '#73FFA2',
                  boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset'
                }}
              >
                Únete a TANKU
              </Link>
            </div>
          </div>
        </div>

        {/* Layout desktop: Texto centrado */}
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
            {rotatingTexts[rotatingTextIndex]}
          </div>
        </div>
        {/* Layout desktop grande */}
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
            {rotatingTexts[rotatingTextIndex]}
          </div>
        </div>

        {/* Botón "Únete a Tanku" - Solo en desktop */}
        <div className="hidden md:flex gap-2 lg:gap-3 flex-shrink-0 items-center self-center">
          <Link
            href="/auth/login"
            className="text-black font-semibold px-4 py-2 rounded-full hover:shadow-lg transition-all duration-300 hover:transform hover:scale-105 text-sm whitespace-nowrap flex-shrink-0 cursor-pointer inline-block text-center"
            style={{ 
              fontFamily: 'Poppins, sans-serif',
              backgroundColor: '#73FFA2',
              boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset'
            }}
          >
            Únete a TANKU
          </Link>
        </div>
      </div>

      {/* Buscador */}
      <div className="px-2 sm:px-3 md:px-4 mb-0.5 pt-2 sm:pt-3 md:pt-4">
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
            placeholder="Buscar"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                // La búsqueda se maneja automáticamente con el onChange
              }
            }}
            className="w-full pl-10 pr-3 py-2 text-sm bg-white text-black rounded-full border border-gray-300 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20 transition-all duration-200"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          />
        </div>
      </div>

      {/* Selector de categorías y botones de categorías */}
      {categories.length > 0 && (
        <div className="px-2 sm:px-3 md:px-4 mb-0.5 pt-0.5">
          <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
            {/* Desplegable de categorías */}
            <CategorySelector
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={handleCategoryChange}
              onShowLoginModal={() => setShowLoginModal(true)}
            />

            {/* Botones de categorías con imagen y nombre (scrollable) */}
            <div className="relative flex-1 min-w-0">
              {/* Flecha izquierda - Oculto en móvil */}
              <button
                onClick={() => {
                  const container = document.getElementById('categories-scroll')
                  if (container) {
                    container.scrollBy({ left: -200, behavior: 'smooth' })
                  }
                }}
                className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700 rounded-full p-1 transition-all duration-200"
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
                className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 md:ml-8 md:mr-8 scrollbar-hide scroll-smooth"
              >
                {/* Botón "Todas" al inicio */}
                <button
                  key="all-categories"
                  data-category-id="all"
                  onClick={() => handleCategoryChange(null)}
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
                    image: c.image || null,
                  }
                  const categoryColors = [
                    '#8B5CF633',
                    '#3B82F633',
                    '#FF6B6B33',
                    '#F9731633',
                    '#EC489933',
                    '#6366F133',
                  ]
                  const categoryColor = categoryColors[index % categoryColors.length]
                  const isSelected = selectedCategoryId === String(category.id)
                  const hasImage = !!category.image

                  return (
                    <button
                      key={category.id}
                      data-category-id={String(category.id)}
                      onClick={() => handleCategoryChange(String(category.id))}
                      className="flex-shrink-0 snap-start cursor-pointer group"
                    >
                      <div
                        className={`flex items-center h-8 sm:h-9 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                          isSelected
                            ? 'border-[#73FFA2] scale-105 shadow-lg shadow-[#73FFA2]/50'
                            : 'border-gray-600 group-hover:border-[#73FFA2]'
                        }`}
                        style={{
                          backgroundColor: categoryColor,
                        }}
                      >
                        {hasImage && category.image ? (
                          <div className="relative w-8 sm:w-9 h-full flex-shrink-0">
                            <Image
                              src={category.image}
                              alt={category.name}
                              fill
                              sizes="(max-width: 640px) 32px, 36px"
                              className="object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0" />
                          </div>
                        ) : (
                          <div className="relative w-8 sm:w-9 h-full flex-shrink-0 bg-gray-600/50" />
                        )}
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

              {/* Flecha derecha - Oculto en móvil */}
              <button
                onClick={() => {
                  const container = document.getElementById('categories-scroll')
                  if (container) {
                    container.scrollBy({ left: 200, behavior: 'smooth' })
                  }
                }}
                className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700 rounded-full p-1 transition-all duration-200"
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
          </div>
        </div>
      )}

      {/* Modal de login para categorías */}
      <CategoryLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setShowLoginModal(false)
        }}
      />
    </div>
  )
}

