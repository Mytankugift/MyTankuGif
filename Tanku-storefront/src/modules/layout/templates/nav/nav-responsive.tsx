"use client"

import { useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CircularMenu from "@modules/layout/components/circular-menu"
import Image from "next/image"
import { usePersonalInfo } from "@lib/context/personal-info-context"
import ProfilePanel from "@modules/layout/components/profile-panel"
import NewPostPanel from "@modules/layout/components/new-post-panel"

interface NavResponsiveProps {
  onNewPostClick: () => void
  onProfileClick: () => void
  activePanel: "none" | "newPost" | "profile"
}

export default function NavResponsive({
  onNewPostClick,
  onProfileClick,
  activePanel,
}: NavResponsiveProps) {
  const { getUser, isLoading } = usePersonalInfo()
  const user = getUser()

  const isExpanded = activePanel !== "none"

  const handleClosePanel = () => {
    if (activePanel === "newPost") {
      onNewPostClick()
    } else if (activePanel === "profile") {
      onProfileClick()
    }
  }

  return (
    <>
      {/* CircularMenu flotante - Posición fija independiente */}
      <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 translate-y-32 scale-[0.70] z-50 lg:hidden">
        <CircularMenu />
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "h-[90vh]" : "h-16"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Panel expandido */}
          <div
            className={`flex-1 transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-full"
            }`}
            style={{ backgroundColor: "#2D3A3A" }}
          >
            {activePanel === "newPost" && (
              <NewPostPanel onClose={handleClosePanel} />
            )}

            {activePanel === "profile" && (
              <ProfilePanel onClose={handleClosePanel} />
            )}
          </div>

          <nav
            className="h-16 flex items-center justify-between px-1 py-1 -mb-1 flex-shrink-0"
            style={{ backgroundColor: "#2D3A3A" }}
          >
            {/* Inicio */}
            <LocalizedClientLink
              href="/"
              className="flex flex-col items-center justify-center group hover:opacity-80 transition-opacity p-1"
            >
              <Image
                src="/feed/Icons/Home_Green.png"
                alt="Inicio"
                width={32}
                height={32}
                className="object-contain"
              />
              {/* <span 
            className="text-[11px] mt-0.5 leading-none font-medium"
            style={{ color: '#73FFA2' }}
          >
            Inicio
          </span> */}
            </LocalizedClientLink>

            {/* Nuevo Post */}
            <button
              onClick={onNewPostClick}
              className={`flex flex-col items-center justify-center group hover:opacity-80 transition-all p-1 z-90 ${
                activePanel === "newPost" ? "bg-white/20 rounded-lg" : ""
              }`}
            >
              <Image
                src="/feed/Icons/Add_Green.png"
                alt="Nuevo Post"
                width={32}
                height={32}
                className="object-contain "
              />
              {/* <span 
            className="text-[11px] mt-0.5 leading-none font-medium"
            style={{ color: '#73FFA2' }}
          >
            Post
          </span> */}
            </button>

            {/* Espacio para el CircularMenu flotante */}
            <div className="w-24"></div>

            {/* Perfil */}
            <button
              onClick={onProfileClick}
              className={`flex flex-col items-center justify-center group hover:opacity-80 transition-all p-1 z-90 ${
                activePanel === "profile" ? "bg-white/20 rounded-lg" : ""
              }`}
            >
              {isLoading ? (
                <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
              ) : (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center">
                  <Image
                    src={user?.avatarUrl || "/default-avatar.png"}
                    alt="User Avatar"
                    width={32}
                    height={32}
                    className="object-cover rounded-full w-full h-full"
                  />
                </div>
              )}
              {/* <span 
            className="text-[11px] mt-0.5 leading-none font-medium"
            style={{ color: '#73FFA2' }}
          >
            Perfil
          </span> */}
            </button>

            {/* Sorprende */}
            <LocalizedClientLink
              href="/cart"
              className="flex flex-col items-center justify-center group hover:opacity-80 transition-opacity p-1"
            >
              <Image
                src="/feed/Icons/Shopping_Cart_Green.png"
                alt="Sorprende"
                width={32}
                height={32}
                className="object-contain"
              />
              {/* <span 
            className="text-[11px] mt-0.5 leading-none font-medium"
            style={{ color: '#73FFA2' }}
          >
            Cart
          </span> */}
            </LocalizedClientLink>
          </nav>
        </div>
      </div>
    </>
  )
}
