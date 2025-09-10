"use client"

import { Suspense, useState, useRef, useEffect } from "react"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import CircularMenu from "@modules/layout/components/circular-menu"
import Image from "next/image"
import {  PencilSquare } from "@medusajs/icons"
import { Avatar } from "@medusajs/ui"
import ProfilePanel from "@modules/layout/components/profile-panel"
import SellerPanel from "@modules/layout/components/profile-panel/sellerPanle"
import NewPostPanel from "@modules/layout/components/new-post-panel"
import { updateAvatar } from "@modules/personal-info/actions/update-avatar"
import { updateStatusMessage } from "@modules/personal-info/actions/update-status-message"
import { usePersonalInfo } from "@lib/context/personal-info-context"
import NavResponsive from "./nav-responsive"

function NavContent() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activePanel, setActivePanel] = useState<'none' | 'newPost' | 'profile'>('none')
  const [panelType, setPanelType] = useState<'profile' | 'seller'>('profile')
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [tempStatusMessage, setTempStatusMessage] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Use personal info context
  const { getUser, refreshPersonalInfo, isLoading } = usePersonalInfo()
  const user = getUser()

  // Fallback logic if user data is not available
  useEffect(() => {
    if (!user && !isLoading) {
    
      refreshPersonalInfo()
    }
  }, [user, isLoading, refreshPersonalInfo]);

  const handleNewPostClick = () => {
    if (activePanel === 'newPost' && isExpanded) {
      // Si ya está abierto el panel de nuevo post, cerrarlo
      setIsExpanded(false)
      setActivePanel('none')
    } else {
      // Abrir panel de nuevo post
      setIsExpanded(true)
      setActivePanel('newPost')
    }
  }

  const handleAvatarClick = () => {
    if (activePanel === 'profile' && isExpanded) {
      // Si ya está abierto el panel de perfil, cerrarlo
      setIsExpanded(false)
      setActivePanel('none')
    } else {
      // Abrir panel de perfil
      setIsExpanded(true)
      setActivePanel('profile')
    }
  }

  const handleClosePanel = () => {
    setIsExpanded(false)
    setActivePanel('none')
  }

  const handlePanelTypeToggle = () => {
    setPanelType(prev => prev === 'profile' ? 'seller' : 'profile')
  }

  const handleEditAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Evitar que se active el onClick del avatar
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB')
      return
    }

    setIsUpdatingAvatar(true)

    try {
      // Verificar que tenemos un customer_id
      if (!user?.id) {
        alert('Error: No se pudo identificar al usuario');
        return;
      }
      
      const result = await updateAvatar({
        customer_id: user.id,
        avatar: file
      })

      if (result.success && result.data?.avatar_url) {
        // Refresh context to get updated avatar
        await refreshPersonalInfo()
      
      } else {
        console.error('Error al actualizar avatar:', result.error)
        alert('Error al actualizar el avatar: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating avatar:', error)
      alert('Error al actualizar el avatar')
    } finally {
      setIsUpdatingAvatar(false)
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleEditStatusClick = () => {
    setTempStatusMessage(user?.statusMessage || '')
    setIsEditingStatus(true)
  }

  const handleSaveStatus = async () => {
    if (!user?.id) {
      alert('Error: No se pudo identificar al usuario')
      return
    }

    if (tempStatusMessage.trim() === '') {
      alert('El mensaje de estado no puede estar vacío')
      return
    }

    setIsUpdatingStatus(true)

    try {
      const result = await updateStatusMessage({
        customer_id: user.id,
        status_message: tempStatusMessage.trim()
      })

      if (result.success) {
        // Refresh context to get updated status message
        await refreshPersonalInfo()
        setIsEditingStatus(false);
    
      } else {
        console.error('Error al actualizar status message:', result.error);
        alert('Error al actualizar el mensaje: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating status message:', error)
      alert('Error al actualizar el mensaje')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleCancelStatusEdit = () => {
    setTempStatusMessage('')
    setIsEditingStatus(false)
  }

  const handleStatusKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveStatus()
    } else if (e.key === 'Escape') {
      handleCancelStatusEdit()
    }
  }

  return (
    <>
      {/* Navegación responsive para móviles */}
      <NavResponsive 
        onNewPostClick={handleNewPostClick}
        onProfileClick={handleAvatarClick}
        activePanel={activePanel}
      />
      
      {/* Navegación original para desktop */}
      <div 
        className={`hidden lg:block fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-[90vw]' : 'w-52'
        }`}
      >
      <nav 
        className="h-full flex"
        style={{ backgroundColor: '#2D3A3A' }}
      >
        {/* Sidebar original */}
        <div className="w-52 flex flex-col items-center py-3 px-4 flex-shrink-0">
        {/* Logo centrado */}
        <div className="flex justify-center mb-3">
          <Image 
            src="/logoTanku.png" 
            alt="Logo" 
            width={80} 
            height={80} 
            className="object-contain"
          />
        </div>
        {/* Hexagon border container */}
          <div className="mb-1 relative flex flex-col items-center">
            <div className="relative" style={{ width: "160px", height: "180px" }}>
              {/* SVG Hexagon Border */}
              <svg 
                className="absolute inset-0 w-full h-full" 
                viewBox="0 0 180 200" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ transform: "rotate(90deg)" }}
              >
                <path 
                  d="M45 13.4L135 13.4L180 100L135 186.6L45 186.6L0 100Z" 
                  stroke="#66DEDB" 
                  strokeWidth="3" 
                  fill="transparent"
                />
              </svg>
              
              {/* Content container */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center p-6 "
              >
              <div className="relative group">
                <button
                  onClick={handleAvatarClick}
                  className="relative hover:scale-105 transition-transform duration-200"
                  disabled={isUpdatingAvatar}
                >
                  <div className={`flex items-center justify-center relative ${
                      isUpdatingAvatar ? "opacity-50" : ""
                    }`}>
                    {isLoading ? (
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700 animate-pulse" />
                    ) : (
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-white flex items-center justify-center ">
                        <Image
                          src={user?.avatarUrl || "/default-avatar.png"}
                          alt="User Avatar"
                          width={76}
                          height={76}
                          className="object-cover rounded-full w-full h-full"
                        />
                      </div>
                    )}
                  </div>
                </button>
                <button
                  onClick={handleEditAvatarClick}
                  className="absolute top-1 -right-1 w-6 h-6 bg-[#73FFA2] rounded-full flex items-center justify-center shadow-lg hover:bg-[#66e891] transition-colors duration-200 opacity-0 group-hover:opacity-100"
                  disabled={isUpdatingAvatar}
                  title="Cambiar avatar"
                >
                  <PencilSquare className="w-4 h-4 text-gray-800"  />
                </button>
              </div>

              <div className="w-full px-2">
                <div className="relative group">
                  <div className="flex items-center gap-1 rounded-lg min-h-[16px] justify-center">
                    <p className="text-xs text-white/90 flex-1 text-center truncate leading-tight">
                      {user?.statusMessage || "¡Hola! Este es mi estado"}
                    </p>
                    <PencilSquare
                      className="cursor-pointer text-[#73FFA2] hover:text-[#66e891] flex-shrink-0 w-3 h-3"
                      onClick={handleEditStatusClick}
                    />
                  </div>
                  
                  {/* Edit Status Tooltip */}
                  {isEditingStatus && (
                    <div className="absolute top-full left-40 transform -translate-x-1/2 mt-2 z-50">
                      <div className="bg-gray-800 border border-[#66DEDB] rounded-lg p-3 shadow-lg min-w-[250px]">
                        <input
                          type="text"
                          value={tempStatusMessage}
                          onChange={(e) => setTempStatusMessage(e.target.value)}
                          onKeyDown={handleStatusKeyPress}
                          className="w-full bg-transparent text-xs text-white border-b border-[#73FFA2] focus:outline-none focus:border-[#66e891] pb-1 mb-2"
                          placeholder="Escribe tu mensaje..."
                          maxLength={200}
                          autoFocus
                          disabled={isUpdatingStatus}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleCancelStatusEdit}
                            className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                            disabled={isUpdatingStatus}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveStatus}
                            className="px-3 py-1 text-xs bg-[#73FFA2] text-gray-800 rounded hover:bg-[#66e891] transition-colors disabled:opacity-50"
                            disabled={
                              isUpdatingStatus || tempStatusMessage.trim() === ""
                            }
                          >
                            {isUpdatingStatus ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                        {/* Arrow pointing up */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2">
                          <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          </div>

        {/* Menú vertical */}
        <div className="flex flex-col gap-1  flex-1 w-full px-2">
          {/* Inicio */}
          <LocalizedClientLink 
            href="/" 
            className="flex items-center gap-4 group hover:opacity-80 transition-opacity px-4 py-2 rounded-lg hover:bg-white/10"
          >
            <Image 
              src="/feed/Icons/Home_Green.png" 
              alt="Inicio" 
              width={28} 
              height={28} 
              className="object-contain flex-shrink-0"
            />
            <span 
              className="text-sm font-medium"
              style={{ color: '#73FFA2' }}
            >
              Inicio
            </span>
          </LocalizedClientLink>

          {/* Nuevo Post - Clickeable para expandir */}
          <button 
            onClick={handleNewPostClick}
            className={`flex items-center gap-4 group hover:opacity-80 transition-all px-4 py-2 rounded-lg hover:bg-white/10 w-full ${
              activePanel === 'newPost' ? 'bg-white/20' : ''
            }`}
          >
            <Image 
              src="/feed/Icons/Add_Green.png" 
              alt="Nuevo Post" 
              width={28} 
              height={28} 
              className="object-contain flex-shrink-0"
            />
            <span 
              className="text-sm font-medium"
              style={{ color: '#73FFA2' }}
            >
              Nuevo Post
            </span>
          </button>

          {/* Perfil */}
          <button 
            onClick={handleAvatarClick}
            className="flex items-center gap-4 group hover:opacity-80 transition-opacity px-4 py-2 rounded-lg hover:bg-white/10"
          >
            <Image 
              src="/feed/Icons/Profile_Green.png" 
              alt="Perfil" 
              width={28} 
              height={28} 
              className="object-contain flex-shrink-0"
            />
            <span 
              className="text-sm font-medium"
              style={{ color: '#73FFA2' }}
            >
              Perfil
            </span>
          </button>

          {/* Sorprende */}
          <LocalizedClientLink 
            href="/cart" 
            className="flex items-center gap-4 group hover:opacity-80 transition-opacity px-4 py-2 rounded-lg hover:bg-white/10"
          >
            <Image 
              src="/feed/Icons/Shopping_Cart_Green.png" 
              alt="Sorprende" 
              width={28} 
              height={28} 
              className="object-contain flex-shrink-0"
            />
            <span 
              className="text-sm font-medium"
              style={{ color: '#73FFA2' }}
            >
              Sorprende
            </span>
          </LocalizedClientLink>
        </div>
        {/* <CartButton/> */}
        {/* Circular Menu */}
        <div className="flex items-start justify-start">
          <CircularMenu />
        </div>
        
        </div>

        {/* Panel expandido */}
        <div 
          className={`flex-1 transition-all duration-300 ease-in-out overflow-hidden ${
            isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
          }`}
          style={{ backgroundColor: '#2D3A3A' }}
        >
          {}

          {activePanel === 'newPost' && (
            <NewPostPanel onClose={handleClosePanel} />
          )}

          {activePanel === 'profile' && ( 
            <div className="h-full flex flex-col py-1 overflow-y-auto ">
              {/* Switch Button */}
              <div className="flex justify-start items-center border-gray-600 ml-20 gap-5">
                <button
                  onClick={handlePanelTypeToggle}
                  className={`px-4 py-1 rounded-full font-medium text-sm transition-all duration-300 ${
                    panelType === 'profile'
                      ? 'bg-[#73FFA2] text-gray-900'
                      : 'bg-[#66DEDB] text-gray-900'
                  }`}
                >
                  {panelType === 'profile' ? 'Ir a Tienda' : 'Ir al Perfil'}
                </button> 
                {panelType === 'profile' ? <p className="text-sm text-gray-400">
                  ¿ Quieres vender en Tanku?
                </p> : null}
              </div>
              
              {/* Panel Content */}
              <div className="flex-1">
                {panelType === 'profile' ? (
                  <ProfilePanel onClose={handleClosePanel} />
                ) : (
                  <SellerPanel onClose={handleClosePanel} />
                )}
              </div>
            </div>
          )}

        </div>

        {/* Hidden file input for avatar upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

      </nav>
      </div>
    </>
  )
}

export default function Nav() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NavContent />
    </Suspense>
  )
}
