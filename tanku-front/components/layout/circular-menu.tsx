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

  const fontSize = isTablet ? '11' : '14'

  return (
    <div className="relative flex-shrink-0 w-64 h-64 md:w-48 md:h-48">
      <div
        className="absolute rounded-full z-0 bg-[#2D3A3A] w-[179.2px] h-[179.2px] left-[38.4px] top-[38.4px] md:w-[134.4px] md:h-[134.4px] md:left-[28.8px] md:top-[28.8px]"
      ></div>
      {/* SVG for curved text - 4 posiciones: arriba, derecha, izquierda, abajo */}
      {/* Solución simplificada: un solo arco base rotado para cada posición */}
      <svg
        className="absolute pointer-events-none z-50 w-64 h-64 md:w-48 md:h-48"
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
            fontSize={fontSize}
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

        {/* Texto EVENTOS a la derecha - rotación 90° */}
        <g transform="rotate(90 128 128)">
          <text
            className={`font-semibold tracking-wider transition-all duration-300 ${
              hoveredText === 'events' ? 'fill-white' : 'fill-gray-400'
            }`}
            fontSize={fontSize}
            style={{
              filter:
                hoveredText === 'events'
                  ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))'
                  : 'none',
              transform: hoveredText === 'events' ? 'scale(1.2)' : 'scale(1)',
              transformOrigin: 'center',
            }}
          >
            <textPath href="#base-arc" startOffset="50%" textAnchor="middle">
              EVENTOS
            </textPath>
          </text>
        </g>

        {/* Abajo: mismo #base-arc que arriba (misma distancia al centro); doble 180° = mismo anillo que NUEVO POST */}
        <g transform="rotate(180 128 128)">
          <text
            className="font-semibold tracking-wider fill-gray-400"
            fontSize={fontSize}
            transform="rotate(180 128 198)"
            style={{ transformOrigin: 'center' }}
          >
            <textPath href="#base-arc" startOffset="50%" textAnchor="middle">
              EVENTOSasd
            </textPath>
          </text>
        </g>

        {/* Texto placeholder a la izquierda - rotación 270° */}
        <g transform="rotate(270 128 128)">
          <text
            className="font-semibold tracking-wider fill-gray-400"
            fontSize={fontSize}
            style={{
              transformOrigin: 'center',
            }}
          >
            <textPath href="#base-arc" startOffset="50%" textAnchor="middle">
            EVENTOS
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

      {/* Invisible clickable button overlay - EVENTOS a la derecha */}
      <button
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-24 cursor-pointer z-50"
        onClick={() => {
          if (isAuthenticated) {
            setShowEventsModal(true)
          } else {
            setShowLoginModal(true)
          }
        }}
        onMouseEnter={() => setHoveredText('events')}
        onMouseLeave={() => setHoveredText(null)}
        aria-label="Events"
      />

      {/* Central Circle */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className="w-28 h-28 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-4 md:border-3 border-greenTanku flex items-center justify-center relative overflow-hidden"
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
          <div className="relative z-10 text-center px-2 md:px-1">
            <h3 className="text-white text-sm md:text-xs font-bold leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
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

