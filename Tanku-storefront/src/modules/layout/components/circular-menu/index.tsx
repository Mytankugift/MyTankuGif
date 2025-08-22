"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import CircularMenuModal from "../circular-menu-modal"
import WishlistManager from "../wishlist-manager"
import NewPostPanel from "../new-post-panel"
import CalendarEventForm from "../calendar-event-form"

const CircularMenu = () => {
  const [hoveredText, setHoveredText] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<string | null>(null)
  const router = useRouter()

  const menuItems = [
    { id: "new-event", label: "NEW EVENT", href: "/events/new", position: "top" },
    { id: "calendar", label: "CALENDAR", href: "/calendar", position: "left" },
    { id: "wishlist", label: "WISHLIST", href: "/wishlist", position: "bottom" },
    { id: "new-post", label: "NEW POST", href: "/posts/new", position: "right" }
  ]

  const handleItemClick = (href: string) => {
    // Handle wishlist specially with modal
    if (href === "/wishlist") {
      setModalContent("wishlist")
      setModalOpen(true)
    } else {
      // For other items, show placeholder modal for now
      setModalContent(href)
      setModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setModalContent(null)
  }

  const renderModalContent = () => {
    switch (modalContent) {
      case "wishlist":
        return <WishlistManager />
      case "/events/new":
        return (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-white mb-4">Nuevo Evento</h3>
            <p className="text-gray-400">Funcionalidad en desarrollo...</p>
          </div>
        )
      case "/calendar":
        return <CalendarEventForm onClose={handleCloseModal} />
      case "/posts/new":
        return <NewPostPanel onClose={handleCloseModal} />
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-400">Contenido no disponible</p>
          </div>
        )
    }
  }

  const getModalTitle = () => {
    switch (modalContent) {
      case "wishlist":
        return "Gestión de Listas de Deseos"
      case "/events/new":
        return "Crear Nuevo Evento"
      case "/calendar":
        return "Calendario de Eventos"
      case "/posts/new":
        return "Crear Nuevo Post"
      default:
        return "TANKU"
    }
  }

  return (
    <div className="relative w-64 h-64">
      <div className="absolute rounded-full bg-[#2D3A3A] z-0" style={{
        width: '70%',
        height: '70%',
        left: '15%',
        top: '15%'
      }}></div>
      {/* SVG for curved text */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 256 256">
        <defs>
          {/* Define circular paths for text - 2px further from circle */}
          <path
            id="top-arc"
            d="M 66 128 A 62 62 0 0 1 190 128"
            fill="none" 
          />
          <path
            id="bottom-arc"
            d="M 190 128 A 62 62 0 0 1 66 128"
            fill="none"
          />
          <path
            id="left-arc"
            d="M 128 66 A 62 62 0 0 1 128 190"
            fill="none"
          />
          <path
            id="right-arc"
            d="M 128 190 A 62 62 0 0 1 128 66"
            fill="none"
          />
        </defs>

        {/* Curved text elements - visual only */}
        <text
          className={`text-sm font-semibold tracking-wider transition-all duration-300 ${
            hoveredText === "new-event" ? "fill-white" : "fill-gray-400"
          }`}
          style={{
            filter: hoveredText === "new-event" 
              ? "drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))"
              : "none",
            transform: hoveredText === "new-event" ? "scale(1.2)" : "scale(1)",
            transformOrigin: "center"
          }}
        >
          <textPath href="#top-arc" startOffset="50%" textAnchor="middle">
            NEW EVENT
          </textPath>
        </text>

        <text
          className={`text-sm font-semibold tracking-wider transition-all duration-300 ${
            hoveredText === "calendar" ? "fill-white" : "fill-gray-400"
          }`}
          style={{
            filter: hoveredText === "calendar" 
              ? "drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))"
              : "none",
            transform: hoveredText === "calendar" ? "scale(1.2)" : "scale(1)",
            transformOrigin: "center"
          }}
        >
          <textPath href="#right-arc" startOffset="50%" textAnchor="middle">
            CALENDAR
          </textPath>
        </text>

        <text
          className={`text-sm font-semibold tracking-wider transition-all duration-300 ${
            hoveredText === "wishlist" ? "fill-white" : "fill-gray-400"
          }`}
          style={{
            filter: hoveredText === "wishlist" 
              ? "drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))"
              : "none",
            transform: hoveredText === "wishlist" ? "scale(1.2)" : "scale(1)",
            transformOrigin: "center"
          }}
        >
          <textPath href="#bottom-arc" startOffset="50%" textAnchor="middle">
            WISHLIST
          </textPath>
        </text>

        <text
          className={`text-sm font-semibold tracking-wider transition-all duration-300 ${
            hoveredText === "new-post" ? "fill-white" : "fill-gray-400"
          }`}
          style={{
            filter: hoveredText === "new-post" 
              ? "drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.4))"
              : "none",
            transform: hoveredText === "new-post" ? "scale(1.2)" : "scale(1)",
            transformOrigin: "center"
          }}
        >
          <textPath href="#left-arc" startOffset="50%" textAnchor="middle">
            NEW POST
          </textPath>
        </text>
      </svg>

      {/* Invisible clickable button overlays */}
      {/* NEW EVENT - Top */}
      <button
        className="absolute top-4 left-1/2 transform -translate-x-1/2 w-24 h-12 cursor-pointer z-10 "
        onClick={() => handleItemClick("/events/new")}
        onMouseEnter={() => setHoveredText("new-event")}
        onMouseLeave={() => setHoveredText(null)}
        aria-label="New Event"
      />

      {/* CALENDAR - Left */}
      <button
        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-24 cursor-pointer z-10"
        onClick={() => handleItemClick("/calendar")}
        onMouseEnter={() => setHoveredText("calendar")}
        onMouseLeave={() => setHoveredText(null)}
        aria-label="Calendar"
      />

      {/* WISHLIST - Bottom */}
      <button
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-24 h-12 cursor-pointer z-10"
        onClick={() => handleItemClick("/wishlist")}
        onMouseEnter={() => setHoveredText("wishlist")}
        onMouseLeave={() => setHoveredText(null)}
        aria-label="Wishlist"
      />

      {/* NEW POST - Right */}
      <button
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-24 cursor-pointer z-10"
        onClick={() => handleItemClick("/posts/new")}
        onMouseEnter={() => setHoveredText("new-post")}
        onMouseLeave={() => setHoveredText(null)}
        aria-label="New Post"
      />

      {/* Central Circle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-[#73FFA2] flex items-center justify-center relative overflow-hidden" style={{
          boxShadow: `
            0 0 10px rgba(115, 255, 162, 0.4),
            0 0 20px rgba(115, 255, 162, 0.3),
            0 0 30px rgba(115, 255, 162, 0.2),
            inset 0 0 10px rgba(115, 255, 162, 0.05)
          `
        }}>
          {/* Glowing effect */}
          <div className="absolute inset-0 rounded-full bg-[#73FFA2] opacity-20 animate-pulse"></div>
          
          {/* Central text */}
          <div className="relative z-10 text-center px-2">
            <h3 className="text-white text-sm font-bold leading-tight">
              ¿Qué<br />
              Quieres<br />
              Hacer<br />
              Hoy?
            </h3>
          </div>
        </div>
      </div>

      {/* Modal */}
      <CircularMenuModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={getModalTitle()}
      >
        {renderModalContent()}
      </CircularMenuModal>
    </div>
  )
}

export default CircularMenu
