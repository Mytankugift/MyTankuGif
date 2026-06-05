'use client'

import React, { useState, useEffect, forwardRef } from 'react'
import Image from 'next/image'
import { clsx } from 'clsx'
import { getGoogleOAuthUrl } from '@/lib/auth/google-oauth'
import { FeedCategoryBar } from '@/components/feed/feed-category-bar'
import { FeedCategoriesMobileModal } from '@/components/feed/feed-categories-mobile-modal'
import type { FeedNavScrollState } from '@/lib/hooks/use-feed-scroll-nav'

interface LandingNavProps {
  categories?: { id: string | number; name: string; image?: string | null; parentId?: string | null }[]
  selectedCategoryId?: string | null
  onCategoryChange?: (categoryId: string | null) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  /** Mismo que /feed: compactMid + minimalMode para barra de categorías (no grid 0fr: evita el “tildado” al scroll). */
  feedNavScroll: FeedNavScrollState
}

export const LandingNav = forwardRef<HTMLDivElement, LandingNavProps>(function LandingNav(
  {
    categories = [],
    selectedCategoryId = null,
    onCategoryChange = () => {},
    searchQuery = '',
    onSearchChange = () => {},
    feedNavScroll,
  },
  ref
) {
  const { compactMid } = feedNavScroll
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false)
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

  return (
    <div
      ref={ref}
      id="landing-nav-chrome"
      className="fixed inset-x-0 top-0 z-40 flex flex-col flex-shrink-0 shadow-lg max-md:bg-[rgba(25,30,35,0.62)] max-md:backdrop-blur-xl max-md:backdrop-saturate-150 md:inset-x-auto md:left-36 md:right-0 md:bg-[var(--color-surface-191e23-20)] md:backdrop-blur-none md:backdrop-saturate-100 md:[-webkit-backdrop-filter:none] lg:left-[208px]"
    >
      {/* Branding fijo: logo + eslogan + Únete (no se ocultan al deslizar) */}
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
        </div>

        {/* Tablet/desktop: solo eslogan centrado + Únete (logo Tanku solo en móvil arriba) */}
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

        <div className="hidden md:flex gap-2 lg:gap-3 flex-shrink-0 items-center self-center">
          <a
            href={getGoogleOAuthUrl('/feed')}
            className="text-black font-semibold px-4 py-2 rounded-full hover:shadow-lg transition-all duration-300 hover:transform hover:scale-105 text-sm whitespace-nowrap flex-shrink-0 cursor-pointer inline-block text-center"
            style={{
              fontFamily: 'Poppins, sans-serif',
              backgroundColor: '#73FFA2',
              boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset',
            }}
          >
            Únete a TANKU
          </a>
        </div>
      </div>

      {/* Mismo patrón que feed-nav: buscador con compactMid; categorías vía feedNavScroll (minimalMode = ocultar carril). */}
      <div
        className={clsx(
          'px-2 sm:px-3 md:px-4 mb-0.5 pt-2 sm:pt-3 md:pt-4 transition-all duration-300 ease-out',
          compactMid && 'origin-top scale-[0.96] [will-change:transform]'
        )}
      >
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
            placeholder="Buscar"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                // La búsqueda se maneja automáticamente con el onChange
              }
            }}
            className="tanku-pill-search-input w-full pl-10 pr-3 py-2 rounded-full border border-white/10 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20 transition-all duration-200"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          />
        </div>
      </div>

      {categories.length > 0 && (
        <FeedCategoryBar
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={onCategoryChange}
          feedNavScroll={feedNavScroll}
          onOpenCategoriesModal={() => setCategoriesModalOpen(true)}
        />
      )}

      <FeedCategoriesMobileModal
        open={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onPickCategory={onCategoryChange}
      />
    </div>
  )
})
