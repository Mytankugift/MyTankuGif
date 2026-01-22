'use client'

import React, { useState } from 'react'
import { CreatePostModal } from '@/components/posters/create-post-modal'

const CircularMenu = () => {
  const [hoveredText, setHoveredText] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<string | null>(null)
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false)

  const menuItems = [
    { id: 'new-event', label: 'NEW EVENT', href: '/events/new', position: 'top' },
    { id: 'calendar', label: 'CALENDAR', href: '/calendar', position: 'left' },
    { id: 'new-post', label: 'NEW POST', href: '/posts/new', position: 'right' },
  ]

  const handleItemClick = (href: string) => {
    setModalContent(href)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setModalContent(null)
  }

  return (
    <div className="relative flex-shrink-0" style={{ width: '256px', height: '256px' }}>
      <div
        className="absolute rounded-full z-0"
        style={{
          backgroundColor: '#2D3A3A',
          width: '179.2px',
          height: '179.2px',
          left: '38.4px',
          top: '38.4px',
        }}
      ></div>
      {/* SVG for curved text */}
      <svg
        className="absolute pointer-events-none z-50"
        viewBox="0 0 256 256"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '256px', height: '256px', top: 0, left: 0 }}
      >
        <defs>
          <path id="top-arc-text" d="M 53 128 A 75 75 0 0 1 203 128" fill="none" />
          <path id="right-arc-text" d="M 128 203 A 75 75 0 0 1 128 53" fill="none" />
          <path id="left-arc-text" d="M 128 53 A 75 75 0 0 1 128 203" fill="none" />
        </defs>

        <text
          className={`font-semibold tracking-wider transition-all duration-300 ${
            hoveredText === 'new-event' ? 'fill-white' : 'fill-gray-400'
          }`}
          fontSize="14"
          style={{
            filter:
              hoveredText === 'new-event'
                ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))'
                : 'none',
            transform: hoveredText === 'new-event' ? 'scale(1.2)' : 'scale(1)',
            transformOrigin: 'center',
          }}
        >
          <textPath href="#top-arc-text" startOffset="50%" textAnchor="middle">
            NUEVO EVENTO
          </textPath>
        </text>

        <text
          className={`font-semibold tracking-wider transition-all duration-300 ${
            hoveredText === 'calendar' ? 'fill-white' : 'fill-gray-400'
          }`}
          fontSize="14"
          style={{
            filter:
              hoveredText === 'calendar'
                ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))'
                : 'none',
            transform: hoveredText === 'calendar' ? 'scale(1.2)' : 'scale(1)',
            transformOrigin: 'center',
          }}
        >
          <textPath href="#right-arc-text" startOffset="50%" textAnchor="middle">
            CALENDARIO
          </textPath>
        </text>

        <text
          className={`font-semibold tracking-wider transition-all duration-300 ${
            hoveredText === 'new-post' ? 'fill-white' : 'fill-gray-400'
          }`}
          fontSize="14"
          style={{
            filter:
              hoveredText === 'new-post'
                ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))'
                : 'none',
            transform: hoveredText === 'new-post' ? 'scale(1.2)' : 'scale(1)',
            transformOrigin: 'center',
          }}
        >
          <textPath href="#left-arc-text" startOffset="50%" textAnchor="middle">
            NUEVO POST
          </textPath>
        </text>
      </svg>

      {/* Invisible clickable button overlays */}
      <button
        className="absolute top-4 left-1/2 transform -translate-x-1/2 w-24 h-12 cursor-pointer z-50"
        onClick={() => handleItemClick('/events/new')}
        onMouseEnter={() => setHoveredText('new-event')}
        onMouseLeave={() => setHoveredText(null)}
        aria-label="New Event"
      />

      <button
        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-24 cursor-pointer z-50"
        onClick={() => handleItemClick('/calendar')}
        onMouseEnter={() => setHoveredText('calendar')}
        onMouseLeave={() => setHoveredText(null)}
        aria-label="Calendar"
      />

      <button
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-24 cursor-pointer z-50"
        onClick={() => setCreatePostModalOpen(true)}
        onMouseEnter={() => setHoveredText('new-post')}
        onMouseLeave={() => setHoveredText(null)}
        aria-label="New Post"
      />

      {/* Central Circle */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-greenTanku flex items-center justify-center relative overflow-hidden"
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
          <div className="relative z-10 text-center px-2">
            <h3 className="text-white text-sm font-bold leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
              ¿Qué<br />
              Quieres<br />
              Hacer<br />
              Hoy?
            </h3>
          </div>
        </div>
      </div>

      {/* Modal placeholder para otros items */}
      {modalOpen && modalContent !== '/posts/new' && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={handleCloseModal}
        >
          <div
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-semibold">TANKU</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="text-gray-400 text-center py-8">
              Funcionalidad en desarrollo...
            </div>
          </div>
        </div>
      )}

      {/* Modal de creación de post */}
      <CreatePostModal
        isOpen={createPostModalOpen}
        onClose={() => setCreatePostModalOpen(false)}
        onPostCreated={() => {
          setCreatePostModalOpen(false)
          // El feed se actualizará automáticamente en la próxima carga
          // No necesitamos recargar toda la página
        }}
      />
    </div>
  )
}

export default CircularMenu

