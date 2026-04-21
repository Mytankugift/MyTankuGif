'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreatePostModal } from '@/components/posters/create-post-modal'
import { CategoryLoginModal } from '@/components/feed/category-login-modal'
import { EventsModal } from '@/components/events/events-modal'
import { useAuthStore } from '@/lib/stores/auth-store'

const CircularMenu = () => {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [hoveredText, setHoveredText] = useState<string | null>(null)
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showEventsModal, setShowEventsModal] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkTablet = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
    }
    checkTablet()
    window.addEventListener('resize', checkTablet)
    return () => window.removeEventListener('resize', checkTablet)
  }, [])

  /** Mismo tamaño para NUEVO POST y NUEVO EVENTO en el arco SVG */
  const arcFontSize = isTablet ? '10' : '12'

  return (
    <div className="relative flex h-64 w-64 flex-shrink-0 md:h-48 md:w-48 lg:h-56 lg:w-56">
      <div
        className="absolute left-[38.4px] top-[38.4px] z-0 h-[179.2px] w-[179.2px] rounded-full bg-[#2D3A3A]/0 backdrop-blur-md md:left-[28.8px] md:top-[28.8px] md:h-[134.4px] md:w-[134.4px] lg:left-[33.6px] lg:top-[33.6px] lg:h-[156.8px] lg:w-[156.8px]"
        aria-hidden
      />
      {/* SVG: texto curvo arriba (NUEVO POST) y a la derecha (NUEVO EVENTO) */}
      <svg
        className="pointer-events-none absolute z-50 h-64 w-64 md:h-48 md:w-48 lg:h-56 lg:w-56"
        viewBox="0 0 256 256"
        preserveAspectRatio="xMidYMid meet"
        style={{ top: 0, left: 0 }}
      >
        <defs>
          {/* Mismo arco para las 4 posiciones (abajo: rotate 180° + rotate 180° en el vértice inferior) */}
          <path id="base-arc" d="M 58 128 A 70 70 0 0 1 198 128" fill="none" />
        </defs>

        {/* Texto NUEVO POST arriba - rotación 0° */}
        <g transform="rotate(0 128 128)">
          <text
            className={`font-semibold tracking-wider transition-all duration-300 ${
              hoveredText === 'new-post' ? 'fill-white' : 'fill-gray-400'
            }`}
            fontSize={arcFontSize}
            style={{
              filter:
                hoveredText === 'new-post'
                  ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))'
                  : 'none',
              transform: hoveredText === 'new-post' ? 'scale(1.2)' : 'scale(1)',
              transformOrigin: 'center',
            }}
          >
            <textPath href="#base-arc" startOffset="50%" textAnchor="middle">
              NUEVO POST
            </textPath>
          </text>
        </g>

        {/* NUEVO EVENTO a la derecha - rotación 90° */}
        <g transform="rotate(90 128 128)">
          <text
            className={`font-semibold tracking-wider transition-all duration-300 ${
              hoveredText === 'new-event' ? 'fill-white' : 'fill-gray-400'
            }`}
            fontSize={arcFontSize}
            style={{
              filter:
                hoveredText === 'new-event'
                  ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))'
                  : 'none',
              transform: hoveredText === 'new-event' ? 'scale(1.2)' : 'scale(1)',
              transformOrigin: 'center',
            }}
          >
            <textPath href="#base-arc" startOffset="50%" textAnchor="middle">
              NUEVO EVENTO
            </textPath>
          </text>
        </g>
      </svg>

      {/* Invisible clickable button overlay - NUEVO POST arriba */}
      <button
        className="absolute top-4 left-1/2 transform -translate-x-1/2 w-24 h-12 cursor-pointer z-50"
        onClick={() => {
          if (isAuthenticated) {
            setCreatePostModalOpen(true)
          } else {
            setShowLoginModal(true)
          }
        }}
        onMouseEnter={() => setHoveredText('new-post')}
        onMouseLeave={() => setHoveredText(null)}
        aria-label="New Post"
      />

      {/* Invisible clickable overlay - NUEVO EVENTO a la derecha */}
      <button
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-24 cursor-pointer z-50"
        onClick={() => {
          if (isAuthenticated) {
            setShowEventsModal(true)
          } else {
            setShowLoginModal(true)
          }
        }}
        onMouseEnter={() => setHoveredText('new-event')}
        onMouseLeave={() => setHoveredText(null)}
        aria-label="Nuevo evento"
      />

      {/* Central Circle */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-greenTanku bg-gradient-to-br from-gray-800 to-gray-900 md:h-20 md:w-20 md:border-3 lg:h-24 lg:w-24 lg:border-4"
          style={{
            boxShadow: `
              0 0 10px rgba(115, 255, 162, 0.4),
              0 0 20px rgba(115, 255, 162, 0.3),
              0 0 30px rgba(115, 255, 162, 0.2),
              inset 0 0 10px rgba(115, 255, 162, 0.05)
            `,
          }}
        >
          {/* Glowing effect */}
          <div className="absolute inset-0 rounded-full bg-[#73FFA2] opacity-20 animate-pulse"></div>
          <div className="relative z-10 px-2 text-center md:px-1 lg:px-2">
            <h3
              className="text-xs font-bold leading-tight text-white md:text-[10px] lg:text-xs"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              ¿Qué<br />
              Quieres<br />
              Hacer<br />
              Hoy?
            </h3>
          </div>
        </div>
      </div>

      {/* Siempre montar el modal: evita cambiar el árbol de hooks al pasar a autenticado */}
      <CreatePostModal
        isOpen={isAuthenticated && createPostModalOpen}
        onClose={() => setCreatePostModalOpen(false)}
        onPostCreated={() => {
          setCreatePostModalOpen(false)
        }}
      />

      {/* Modal de login para no autenticados */}
      <CategoryLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setShowLoginModal(false)
        }}
      />

      {/* Modal de eventos */}
      <EventsModal
        isOpen={showEventsModal}
        onClose={() => setShowEventsModal(false)}
      />
    </div>
  )
}

export default CircularMenu

