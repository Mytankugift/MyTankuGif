"use client"

import { Suspense, useState, useRef, useEffect } from "react"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import CircularMenu from "@modules/layout/components/circular-menu"
import Image from "next/image"
import {  PencilSquare, Plus, ArrowRightOnRectangle } from "@medusajs/icons"
import { Avatar } from "@medusajs/ui"
import ProfilePanel from "@modules/layout/components/profile-panel"
import SellerPanel from "@modules/layout/components/profile-panel/sellerPanle"
import NewPostPanel from "@modules/layout/components/new-post-panel"
import { updateAvatar } from "@modules/personal-info/actions/update-avatar"
import { updateStatusMessage } from "@modules/personal-info/actions/update-status-message"
import { usePersonalInfo } from "@lib/context/personal-info-context"
import { signout } from "@lib/data/customer"
import { useStoryUpload } from "@lib/context/story-upload-context"
import StoryUpload, { Story } from "@modules/home/components/story-upload"
import NavResponsive from "./nav-responsive"

// Componente ServicesDropdown (ya no es desplegable)
const ServicesDropdown = ({ 
  setIsExpanded, 
  setActivePanel 
}: { 
  setIsExpanded: (expanded: boolean) => void
  setActivePanel: (panel: 'none' | 'newPost' | 'profile') => void
}) => {
  return (
    <div className="mb-2">
      <h3 className="mb-2 px-2" style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 500 }}>Servicios</h3>
      <div className="flex flex-col gap-1">
        {/* StalkerGift */}
        <LocalizedClientLink
          href="/stalkergift"
          className="flex items-center gap-3 group hover:opacity-80 transition-opacity px-4 py-2 rounded-lg hover:bg-white/10 text-left"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 33" fill="none">
            <path d="M29 7.83203V24.5596L15.5156 31.8711L1.04688 24.583L1.00098 7.89062L15.4307 1.11035L29 7.83203Z" stroke="#73FFA2" strokeWidth="2"/>
            <path d="M9.10889 20.5258H11.6108L12.7046 22.5473L11.5981 24.7465L9.13037 24.7534L8.10205 22.56L9.10889 20.5258Z" stroke="#73FFA2" strokeWidth="2"/>
            <path d="M18.5 20.7058H21.002L22.0957 22.7273L20.9893 24.9265L18.5215 24.9333L17.4932 22.74L18.5 20.7058Z" stroke="#73FFA2" strokeWidth="2"/>
            <path d="M3.18018 15.3895L15.3701 16.8269L26.7602 15.381" stroke="#73FFA2" strokeWidth="2"/>
            <path d="M7.92041 12.5435L15.2406 13.14L22.0804 12.54" stroke="#73FFA2" strokeWidth="2"/>
            <path d="M8.04102 15.8824L8.73007 7.97998L12.7501 8.72998H21.2401L21.9217 15.866" stroke="#73FFA2" strokeWidth="2"/>
            <line x1="13.4999" y1="22.04" x2="17.2199" y2="22.0398" stroke="#73FFA2" strokeWidth="2"/>
            <line x1="22.8716" y1="22.0512" x2="23.9282" y2="22.0512" stroke="#73FFA2" strokeWidth="2"/>
            <line x1="6.18018" y1="22.04" x2="7.23683" y2="22.04" stroke="#73FFA2" strokeWidth="2"/>
          </svg>
          <span 
            className="font-normal"
            style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
          >
            StalkerGift
          </span>
        </LocalizedClientLink>

        {/* MultiPay */}
        <LocalizedClientLink
          href="/multipay"
          className="flex items-center gap-3 group hover:opacity-80 transition-opacity px-4 py-2 rounded-lg hover:bg-white/10 text-left"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 33" fill="none">
            <path d="M29 7.83203V24.5596L15.5156 31.8711L1.04688 24.583L1.00098 7.89062L15.4307 1.11035L29 7.83203Z" stroke="#73FFA2" strokeWidth="2"/>
            <path d="M19.7832 14.6308V22.7031L12.543 22.7187L5.25977 22.7031V14.6308H19.7832Z" stroke="#73FFA2" strokeWidth="2"/>
            <path d="M14.4407 17.1952L12.5918 15.7827L10.6304 17.2042L14.247 20.0091" stroke="#73FFA2" strokeWidth="2"/>
            <path d="M10.7578 19.9511L12.7244 21.4786L14.562 19.9421" stroke="#73FFA2" strokeWidth="2"/>
            <line x1="13.4126" y1="21.5923" x2="13.4126" y2="21.9546" stroke="#73FFA2" strokeWidth="2"/>
            <line x1="13.2925" y1="15.287" x2="13.2925" y2="15.6493" stroke="#73FFA2" strokeWidth="2"/>
            <path d="M20.7768 21.7977H23.03V11.7277H14.7906H6.50635V14.1311" stroke="#73FFA2" strokeWidth="2"/>
            <path d="M23.4867 19.3101H25.74V9.23999H17.5006H9.21631V11.6434" stroke="#73FFA2" strokeWidth="2"/>
          </svg>
          <span 
            className="font-normal"
            style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
          >
            MultiPay
          </span>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

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
  const { getUser, refreshPersonalInfo, isLoading, clearPersonalInfo } = usePersonalInfo()
  const user = getUser()
  const { triggerUpload } = useStoryUpload()

  // Cache del avatar URL para evitar que se pierda al navegar
  const [cachedAvatarUrl, setCachedAvatarUrl] = useState<string | null>(null)

  // Mantener el avatar en caché incluso cuando el usuario se desmonta temporalmente
  useEffect(() => {
    if (user?.avatarUrl) {
      setCachedAvatarUrl(user.avatarUrl)
    }
  }, [user?.avatarUrl])

  // Pre-cargar la imagen cuando esté disponible
  useEffect(() => {
    const avatarUrl = user?.avatarUrl || cachedAvatarUrl
    if (avatarUrl && avatarUrl !== "/feed/avatar.png" && avatarUrl.startsWith('http')) {
      // Verificar si ya existe un preload para esta URL
      const existingLink = document.querySelector(`link[rel="preload"][as="image"][href="${avatarUrl}"]`)
      if (!existingLink) {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        link.href = avatarUrl
        document.head.appendChild(link)
        
        return () => {
          // Verificar que el link todavía existe antes de removerlo
          const linkToRemove = document.querySelector(`link[rel="preload"][as="image"][href="${avatarUrl}"]`)
          if (linkToRemove && linkToRemove.parentNode) {
            linkToRemove.parentNode.removeChild(linkToRemove)
          }
        }
      }
    }
  }, [user?.avatarUrl, cachedAvatarUrl])

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

  const handleLogout = async () => {
    try {
      console.log('🔄 Iniciando proceso de cierre de sesión...')
      
      // Limpiar la información personal primero
      clearPersonalInfo()
      
      // Llamar a signout (esto removerá el token de las cookies y limpiará el cache)
      await signout("co")
      
      console.log('✅ Cierre de sesión completado, redirigiendo...')
      
      // Forzar recarga completa de la página para limpiar todo el estado
      // Usar window.location.replace para evitar que se pueda volver atrás
      window.location.replace("/")
    } catch (error) {
      console.error("❌ Error al cerrar sesión:", error)
      // Aún así, intentar limpiar y redirigir
      clearPersonalInfo()
      // Forzar recarga para asegurar que se limpie todo
      window.location.replace("/")
    }
  }
  
  // Verificar si el usuario está autenticado
  const isAuthenticated = !!user?.id

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
          isExpanded ? 'w-[90vw]' : 'w-60'
        }`}
      >
      <nav 
        className="h-full flex"
        style={{ backgroundColor: '#2D3A3A' }}
      >
        {/* Sidebar original */}
        <div className="w-60 flex flex-col py-2 px-2 flex-shrink-0">
        {/* Logo más grande - alineado a la izquierda con StoryUpload personalizado */}
        <div className="flex items-start justify-between w-full mb-8 px-4">
          <Image 
            src="/logoTanku.png" 
            alt="Logo" 
            width={90} 
            height={90} 
            className="object-contain flex-shrink-0"
          />
          {/* StoryUpload personalizado para sidebar - Solo visible si está autenticado */}
          {isAuthenticated && (
            <div 
              className="flex flex-col items-center flex-shrink-0 cursor-pointer group relative"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Sidebar: Activando triggerUpload')
                triggerUpload()
              }}
            >
              {/* Avatar más pequeño */}
              <div className="relative">
                <div 
                  className="w-16 h-16 rounded-full p-0.5 group-hover:opacity-90 transition-opacity relative z-10"
                  style={{
                    background: 'linear-gradient(45deg, #1A485C, #73FFA2)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('Sidebar: Activando triggerUpload desde avatar')
                    triggerUpload()
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                    <Image
                      src={user?.avatarUrl || cachedAvatarUrl || "/feed/avatar.png"}
                      alt="Tu Historia"
                      width={60}
                      height={60}
                      className="w-full h-full object-cover"
                      priority
                      unoptimized={user?.avatarUrl?.startsWith('http') || cachedAvatarUrl?.startsWith('http')}
                      onError={(e) => {
                        // Si falla la carga, usar el placeholder
                        const target = e.target as HTMLImageElement
                        if (target.src !== "/feed/avatar.png") {
                          target.src = "/feed/avatar.png"
                        }
                      }}
                    />
                  </div>
                </div>
                {/* Textbox "¿Whats up?" sobrepuesto debajo de la imagen */}
                <div 
                  className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 px-3 py-1.5 rounded-full min-w-[85px] group-hover:opacity-90 transition-opacity flex items-center justify-center z-0 cursor-pointer"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.45)',
                    color: '#73FFA2'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('Sidebar: Activando triggerUpload desde textbox')
                    triggerUpload()
                  }}
                >
                  <span className="text-xs font-semibold whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>¿Whats up?</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Menú vertical - empujado hacia abajo */}
        <div className="flex flex-col gap-3 flex-1 w-full px-2 mt-auto pt-4">
          {/* Sección GivE-Commerce */}
          <div className="mb-2">
            <h3 className="mb-2 px-2" style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 500 }}>GivE-Commerce</h3>
            <div className="flex flex-col gap-1">
              {/* My TANKU */}
              <LocalizedClientLink 
                href="/" 
                className="flex items-center gap-3 group hover:opacity-80 transition-opacity px-4 py-2 rounded-lg hover:bg-white/10"
              >
                <Image 
                  src="/feed/Icons/Home_Green.png" 
                  alt="My TANKU" 
                  width={30} 
                  height={30} 
                  className="object-contain flex-shrink-0"
                />
                <span 
                  className="font-normal"
                  style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
                >
                  My TANKU
                </span>
              </LocalizedClientLink>

              {/* Mi Perfil */}
              {isAuthenticated ? (
                <LocalizedClientLink 
                  href="/profile" 
                  className="flex items-center gap-3 group hover:opacity-80 transition-opacity px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  <Image 
                    src="/feed/Icons/Profile_Green.png" 
                    alt="Mi Perfil" 
                    width={30} 
                    height={30} 
                    className="object-contain flex-shrink-0"
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
                  >
                    Mi Perfil
                  </span>
                </LocalizedClientLink>
              ) : (
                <div 
                  className="flex items-center gap-3 px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <Image 
                    src="/feed/Icons/Profile_Green.png" 
                    alt="Mi Perfil" 
                    width={30} 
                    height={30} 
                    className="object-contain flex-shrink-0 opacity-50"
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
                  >
                    Mi Perfil
                  </span>
                </div>
              )}

              {/* Amigos */}
              {isAuthenticated ? (
                <LocalizedClientLink 
                  href="/friends" 
                  className="flex items-center gap-3 group hover:opacity-80 transition-opacity px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#73FFA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span 
                    className="font-normal"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
                  >
                    Amigos
                  </span>
                </LocalizedClientLink>
              ) : (
                <div 
                  className="flex items-center gap-3 px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
                  >
                    Amigos
                  </span>
                </div>
              )}

              {/* Wishlist */}
              {isAuthenticated ? (
                <LocalizedClientLink 
                  href="/wishlist" 
                  className="flex items-center gap-3 group hover:opacity-80 transition-opacity px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  <Image 
                    src="/feed/Icons/Shopping_Cart_Green.png" 
                    alt="Wishlist" 
                    width={30} 
                    height={30} 
                    className="object-contain flex-shrink-0"
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
                  >
                    Wishlist
                  </span>
                </LocalizedClientLink>
              ) : (
                <div 
                  className="flex items-center gap-3 px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <Image 
                    src="/feed/Icons/Shopping_Cart_Green.png" 
                    alt="Wishlist" 
                    width={30} 
                    height={30} 
                    className="object-contain flex-shrink-0 opacity-50"
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
                  >
                    Wishlist
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sección Servicios - Desplegable */}
          {isAuthenticated ? (
            <ServicesDropdown 
              setIsExpanded={setIsExpanded}
              setActivePanel={setActivePanel}
            />
          ) : (
            <div className="mb-2">
              <h3 className="mb-2 px-2" style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 500 }}>Servicios</h3>
              <div className="flex flex-col gap-1">
                {/* StalkerGift - Deshabilitado */}
                <div 
                  className="flex items-center gap-3 px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 33" fill="none" className="opacity-50">
                    <path d="M29 7.83203V24.5596L15.5156 31.8711L1.04688 24.583L1.00098 7.89062L15.4307 1.11035L29 7.83203Z" stroke="#666" strokeWidth="2"/>
                    <path d="M9.10889 20.5258H11.6108L12.7046 22.5473L11.5981 24.7465L9.13037 24.7534L8.10205 22.56L9.10889 20.5258Z" stroke="#666" strokeWidth="2"/>
                    <path d="M18.5 20.7058H21.002L22.0957 22.7273L20.9893 24.9265L18.5215 24.9333L17.4932 22.74L18.5 20.7058Z" stroke="#666" strokeWidth="2"/>
                    <path d="M3.18018 15.3895L15.3701 16.8269L26.7602 15.381" stroke="#666" strokeWidth="2"/>
                    <path d="M7.92041 12.5435L15.2406 13.14L22.0804 12.54" stroke="#666" strokeWidth="2"/>
                    <path d="M8.04102 15.8824L8.73007 7.97998L12.7501 8.72998H21.2401L21.9217 15.866" stroke="#666" strokeWidth="2"/>
                    <line x1="13.4999" y1="22.04" x2="17.2199" y2="22.0398" stroke="#666" strokeWidth="2"/>
                    <line x1="22.8716" y1="22.0512" x2="23.9282" y2="22.0512" stroke="#666" strokeWidth="2"/>
                    <line x1="6.18018" y1="22.04" x2="7.23683" y2="22.04" stroke="#666" strokeWidth="2"/>
                  </svg>
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
                  >
                    StalkerGift
                  </span>
                </div>

                {/* MultiPay - Deshabilitado */}
                <div 
                  className="flex items-center gap-3 px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 33" fill="none" className="opacity-50">
                    <path d="M29 7.83203V24.5596L15.5156 31.8711L1.04688 24.583L1.00098 7.89062L15.4307 1.11035L29 7.83203Z" stroke="#666" strokeWidth="2"/>
                    <path d="M19.7832 14.6308V22.7031L12.543 22.7187L5.25977 22.7031V14.6308H19.7832Z" stroke="#666" strokeWidth="2"/>
                    <path d="M14.4407 17.1952L12.5918 15.7827L10.6304 17.2042L14.247 20.0091" stroke="#666" strokeWidth="2"/>
                    <path d="M10.7578 19.9511L12.7244 21.4786L14.562 19.9421" stroke="#666" strokeWidth="2"/>
                    <line x1="13.4126" y1="21.5923" x2="13.4126" y2="21.9546" stroke="#666" strokeWidth="2"/>
                    <line x1="13.2925" y1="15.287" x2="13.2925" y2="15.6493" stroke="#666" strokeWidth="2"/>
                    <path d="M20.7768 21.7977H23.03V11.7277H14.7906H6.50635V14.1311" stroke="#666" strokeWidth="2"/>
                    <path d="M23.4867 19.3101H25.74V9.23999H17.5006H9.21631V11.6434" stroke="#666" strokeWidth="2"/>
                  </svg>
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '20px' }}
                  >
                    MultiPay
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Botón de Logout - Siempre visible en la parte inferior */}
        {user && (
          <div className="px-4 py-2 border-t border-gray-600 mt-auto">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors w-full text-left px-2 py-2 rounded-lg hover:bg-red-500/10"
            >
              <ArrowRightOnRectangle className="w-5 h-5" />
              <span 
                className="font-normal"
                style={{ fontFamily: 'Poppins, sans-serif', fontSize: '18px' }}
              >
                Cerrar sesión
              </span>
            </button>
          </div>
        )}
        
        {/* <CartButton/> */}
        {/* Circular Menu */}
        <div className="flex items-center justify-center w-full pb-4">
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
