'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useChat } from '@/lib/hooks/use-chat'
import CircularMenu from './circular-menu'
import { CreateStoryModal } from '@/components/stories/create-story-modal'

export default function Sidebar() {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { getTotalUnreadCount, lastReceivedMessage, conversations } = useChat()
  const initialAvatar = user?.profile?.avatar || ''
  const [imgSrc, setImgSrc] = useState<string>(initialAvatar)
  const [createStoryModalOpen, setCreateStoryModalOpen] = useState(false)
  
  // ✅ Obtener total de mensajes no leídos para badge (reactivo con useMemo)
  const totalUnread = useMemo(() => {
    return user ? getTotalUnreadCount(user.id) : 0
  }, [user, getTotalUnreadCount, lastReceivedMessage, conversations])

  useEffect(() => {
    setImgSrc(user?.profile?.avatar || '')
  }, [user?.profile?.avatar])

  const handleLogout = () => {
    logout()
    window.location.href = '/feed'
  }

  // Helper para verificar si una ruta está activa (incluye rutas anidadas)
  const isActiveRoute = (route: string) => {
    if (route === '/feed') {
      return pathname === '/feed' || pathname === '/'
    }
    return pathname === route || pathname.startsWith(route + '/')
  }

  return (
    <>
      {/* Sidebar Desktop Completo - Solo visible en pantallas grandes (lg+) */}
      <aside 
        className="hidden lg:block fixed left-0 top-0 h-full w-60 z-50 flex flex-col"
        style={{ backgroundColor: '#2D3A3A' }}
      >
      <div className="w-60 flex flex-col h-full py-2 px-2 flex-shrink-0">
        {/* Logo Tanku - 15% del espacio */}
        <div 
          className={`flex items-start w-full px-4 pb-4 flex-shrink-0 ${isAuthenticated ? 'justify-between' : 'justify-center'}`} 
          style={{ height: '15%', minHeight: '80px' }}
        >
          <Image 
            src="/feed/logo-tanku.svg" 
            alt="Logo Tanku" 
            width={120} 
            height={120} 
            className="object-contain flex-shrink-0"
            style={{ width: '120px', height: '120px' }}
            priority={false}
            loading="eager"
            unoptimized
          />
          {/* Avatar con botón "+" para crear historia - Solo visible si está autenticado */}
          {isAuthenticated && user && (
            <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group relative">
              <div className="relative">
                <div 
                  className="w-16 h-16 rounded-full p-0.5 group-hover:opacity-90 transition-opacity relative z-10 cursor-pointer"
                  style={{
                    background: 'linear-gradient(45deg, #1A485C, #73FFA2)'
                  }}
                  onClick={() => setCreateStoryModalOpen(true)}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt="Tu Historia"
                        width={60}
                        height={60}
                        className="w-full h-full object-cover"
                        priority
                        unoptimized={imgSrc.startsWith('http')}
                        onError={() => setImgSrc('')}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
                        {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                {/* Botón "+" verde Tanku en esquina inferior derecha */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCreateStoryModalOpen(true)
                  }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] rounded-full flex items-center justify-center border-2 border-[#2D3A3A] hover:scale-110 transition-transform cursor-pointer z-20 shadow-lg"
                  title="Crear historia"
                >
                  <span className="text-black font-bold text-lg leading-none">+</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Menú vertical - 55% del espacio */}
        <div className="flex flex-col gap-1.5 w-full px-2 pt-2 pb-2 overflow-y-auto flex-shrink-0" style={{ height: '55%', minHeight: '300px' }}>
          {/* Sección GivE-Commerce */}
          <div className="mb-0.5">
            <h3 
              className="mb-1 px-2" 
              style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 500 }}
            >
              GivE-Commerce
            </h3>
            <div className="flex flex-col gap-0.5">
              {/* My TANKU */}
              {isAuthenticated ? (
                <Link
                  href="/feed"
                  className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_MyTanku_verde.svg"
                    alt="My TANKU"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    My TANKU
                  </span>
                </Link>
              ) : (
                <div
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_MyTanku_verde.svg"
                    alt="My TANKU"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    My TANKU
                  </span>
                </div>
              )}

              {/* Mi Perfil */}
              {isAuthenticated ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
                    alt="Mi Perfil"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    Mi Perfil
                  </span>
                </Link>
              ) : (
                <div 
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
                    alt="Mi Perfil"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0 opacity-50"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    Mi Perfil
                  </span>
                </div>
              )}

              {/* Amigos */}
              {isAuthenticated ? (
                <Link
                  href="/friends"
                  className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_Amigos_verde.svg"
                    alt="Amigos"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    Amigos
                  </span>
                </Link>
              ) : (
                <div 
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_Amigos_verde.svg"
                    alt="Amigos"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0 opacity-50"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    Amigos
                  </span>
                </div>
              )}

              {/* Mensajes */}
              {isAuthenticated ? (
                <Link
                  href="/messages"
                  className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer relative"
                >
                  <div className="relative">
                    <Image
                      src="/icons_tanku/tanku_logo_menu_mensajes_verde.svg"
                      alt="Mensajes"
                      width={30}
                      height={30}
                      className="object-contain flex-shrink-0"
                      style={{ width: '30px', height: '30px' }}
                    />
                    {/* ✅ Badge de mensajes no leídos */}
                    {totalUnread > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#66DEDB] rounded-full border-2 border-[#1E1E1E] flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#1E1E1E]">
                          {totalUnread > 9 ? '9+' : totalUnread}
                        </span>
                      </div>
                    )}
                  </div>
                  <span 
                    className="font-normal"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    Mensajes
                  </span>
                </Link>
              ) : (
                <div 
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_mensajes_verde.svg"
                    alt="Mensajes"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0 opacity-50"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    Mensajes
                  </span>
                </div>
              )}

              {/* Wishlist */}
              {isAuthenticated ? (
                <Link
                  href="/wishlist"
                  className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_whislist_verde.svg"
                    alt="Wishlist"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    Wishlist
                  </span>
                </Link>
              ) : (
                <div 
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_whislist_verde.svg"
                    alt="Wishlist"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0 opacity-50"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    Wishlist
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sección Servicios */}
          <div className="mb-0.5">
            <h3 
              className="mb-1 px-2" 
              style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif', fontSize: '16px', fontWeight: 500 }}
            >
              Servicios
            </h3>
            <div className="flex flex-col gap-0.5">
              {/* StalkerGift */}
              {isAuthenticated ? (
                <Link
                  href="/stalkergift"
                  className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
                    alt="StalkerGift"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    StalkerGift
                  </span>
                </Link>
              ) : (
                <div 
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
                  title="Inicia sesión para acceder"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
                    alt="StalkerGift"
                    width={30}
                    height={30}
                    className="object-contain flex-shrink-0 opacity-50"
                    style={{ width: '30px', height: '30px' }}
                  />
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    StalkerGift
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Línea divisoria después de StalkerGift */}
          <div className="flex-shrink-0 border-t border-gray-600 mt-2"></div>
        </div>

        {/* Circular Menu - máximo 40% del espacio total, encima del footer */}
        <div className="flex-shrink-0 flex items-center justify-center w-full" style={{ height: '25%', minHeight: '150px', maxHeight: '40%', position: 'relative', zIndex: 0 }}>
          <CircularMenu />
        </div>

        {/* Footer con información de contacto - 5% del espacio total, siempre visible */}
        <div className="px-4 py-2 flex items-center justify-center flex-shrink-0" style={{ height: '5%', minHeight: '40px', position: 'relative', zIndex: 10 }}>
          <div className="flex items-center gap-3 justify-center flex-wrap">
              <a 
                href="mailto:contacto@mytanku.com" 
                className="hover:opacity-80 transition-opacity flex items-center justify-center p-2 cursor-pointer"
                title="contacto@mytanku.com"
                style={{ pointerEvents: 'auto' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: '#73FFA2' }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </a>
              <a 
                href="tel:+573013363980" 
                className="hover:opacity-80 transition-opacity flex items-center justify-center p-2 cursor-pointer"
                title="+57 301 3363980"
                style={{ pointerEvents: 'auto' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: '#73FFA2' }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </a>
              <Link
                href="/terms"
                className="hover:opacity-80 transition-opacity flex items-center justify-center p-2 cursor-pointer"
                title="Términos y Condiciones"
                style={{ pointerEvents: 'auto' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: '#73FFA2' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </Link>
          </div>
        </div>
      </div>

      {/* Modal de crear historia */}
      <CreateStoryModal
        isOpen={createStoryModalOpen}
        onClose={() => setCreateStoryModalOpen(false)}
        onStoryCreated={() => {
          setCreateStoryModalOpen(false)
        }}
      />
    </aside>

    {/* Sidebar Compacto (con títulos) - Visible en pantallas medianas (md a lg) */}
    <aside 
      className="hidden md:block lg:hidden fixed left-0 top-0 h-full w-36 z-50 flex flex-col py-2 px-2"
      style={{ backgroundColor: '#2D3A3A' }}
    >
      {/* Logo Tanku - Agrandado */}
      <div className="mb-4 flex justify-center flex-shrink-0" style={{ minHeight: '70px' }}>
        <Image 
          src="/feed/logo-tanku.svg" 
          alt="Logo Tanku" 
          width={80} 
          height={80} 
          className="object-contain"
          style={{ width: '80px', height: '80px' }}
          priority={false}
          loading="eager"
          unoptimized
        />
      </div>

      {/* Avatar con botón "+" para crear historia - Solo visible si está autenticado */}
      {isAuthenticated && user && (
        <div className="mb-4 flex flex-col items-center cursor-pointer group relative flex-shrink-0">
          <div className="relative">
            <div 
              className="w-12 h-12 rounded-full p-0.5 group-hover:opacity-90 transition-opacity relative z-10 cursor-pointer"
              style={{
                background: 'linear-gradient(45deg, #1A485C, #73FFA2)'
              }}
              onClick={() => setCreateStoryModalOpen(true)}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                {imgSrc ? (
                  <Image
                    src={imgSrc}
                    alt="Tu Historia"
                    width={44}
                    height={44}
                    className="w-full h-full object-cover"
                    priority
                    unoptimized={imgSrc.startsWith('http')}
                    onError={() => setImgSrc('')}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">
                    {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            {/* Botón "+" verde Tanku */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCreateStoryModalOpen(true)
              }}
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] rounded-full flex items-center justify-center border-2 border-[#2D3A3A] hover:scale-110 transition-transform cursor-pointer z-20 shadow-lg"
              title="Crear historia"
            >
              <span className="text-black font-bold text-sm leading-none">+</span>
            </button>
          </div>
        </div>
      )}

      {/* Contenedor para menú, Circular Menu y Footer - Permite que el Circular Menu y Footer estén al final */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Menú vertical - Con títulos */}
        <div className="flex flex-col gap-1.5 w-full px-1 pt-2 pb-2 overflow-y-auto">
          {/* Sección GivE-Commerce */}
          <div className="mb-1">
            <h3 
              className="mb-1 px-1 text-center" 
              style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 500 }}
            >
              GivE-Commerce
            </h3>
            <div className="flex flex-col gap-0.5">
              {/* My TANKU */}
              <Link
                href="/feed"
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-opacity hover:bg-white/10 ${
                  isActiveRoute('/feed') ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                }`}
                title="My TANKU"
              >
                <Image
                  src="/icons_tanku/tanku_logo_menu_MyTanku_verde.svg"
                  alt="My TANKU"
                  width={24}
                  height={24}
                  className="object-contain flex-shrink-0"
                  style={{ width: '24px', height: '24px' }}
                />
              </Link>

              {/* Mi Perfil */}
              {isAuthenticated ? (
                <Link
                  href="/profile"
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-opacity hover:bg-white/10 ${
                    isActiveRoute('/profile') ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                  }`}
                  title="Mi Perfil"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
                    alt="Mi Perfil"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
                    style={{ width: '24px', height: '24px' }}
                  />
                </Link>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg opacity-30 cursor-not-allowed" title="Inicia sesión para acceder">
                  <Image
                    src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
                    alt="Mi Perfil"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              )}

              {/* Amigos */}
              {isAuthenticated ? (
                <Link
                  href="/friends"
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-opacity hover:bg-white/10 ${
                    isActiveRoute('/friends') ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                  }`}
                  title="Amigos"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_Amigos_verde.svg"
                    alt="Amigos"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
                    style={{ width: '24px', height: '24px' }}
                  />
                </Link>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg opacity-30 cursor-not-allowed" title="Inicia sesión para acceder">
                  <Image
                    src="/icons_tanku/tanku_logo_menu_Amigos_verde.svg"
                    alt="Amigos"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              )}

              {/* Mensajes */}
              {isAuthenticated ? (
                <Link
                  href="/messages"
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-opacity hover:bg-white/10 relative ${
                    isActiveRoute('/messages') ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                  }`}
                  title="Mensajes"
                >
                  <div className="relative">
                    <Image
                      src="/icons_tanku/tanku_logo_menu_mensajes_verde.svg"
                      alt="Mensajes"
                      width={24}
                      height={24}
                      className="object-contain flex-shrink-0"
                      style={{ width: '24px', height: '24px' }}
                    />
                    {/* Badge de mensajes no leídos */}
                    {totalUnread > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#66DEDB] rounded-full border-2 border-[#1E1E1E] flex items-center justify-center">
                        <span className="text-[8px] font-bold text-[#1E1E1E]">
                          {totalUnread > 9 ? '9+' : totalUnread}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg opacity-30 cursor-not-allowed" title="Inicia sesión para acceder">
                  <Image
                    src="/icons_tanku/tanku_logo_menu_mensajes_verde.svg"
                    alt="Mensajes"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              )}

              {/* Wishlist */}
              {isAuthenticated ? (
                <Link
                  href="/wishlist"
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-opacity hover:bg-white/10 ${
                    isActiveRoute('/wishlist') ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                  }`}
                  title="Wishlist"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_whislist_verde.svg"
                    alt="Wishlist"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
                    style={{ width: '24px', height: '24px' }}
                  />
                </Link>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg opacity-30 cursor-not-allowed" title="Inicia sesión para acceder">
                  <Image
                    src="/icons_tanku/tanku_logo_menu_whislist_verde.svg"
                    alt="Wishlist"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sección Servicios */}
          <div className="mb-1">
            <h3 
              className="mb-1 px-1 text-center" 
              style={{ color: '#66DEDB', fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 500 }}
            >
              Servicios
            </h3>
            <div className="flex flex-col gap-0.5">
              {/* StalkerGift */}
              {isAuthenticated ? (
                <Link
                  href="/stalkergift"
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-opacity hover:bg-white/10 ${
                    isActiveRoute('/stalkergift') ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                  }`}
                  title="StalkerGift"
                >
                  <Image
                    src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
                    alt="StalkerGift"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
                    style={{ width: '24px', height: '24px' }}
                  />
                </Link>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg opacity-30 cursor-not-allowed" title="Inicia sesión para acceder">
                  <Image
                    src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
                    alt="StalkerGift"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spacer para empujar Circular Menu y Footer al final */}
        <div className="flex-1 min-h-0"></div>

        {/* Circular Menu - Más abajo y reducido */}
        <div className="flex-shrink-0 flex items-center justify-center w-full mb-2 mt-auto" style={{ minHeight: '100px', transform: 'scale(0.85)' }}>
          <CircularMenu />
        </div>

        {/* Footer con información de contacto */}
        <div className="px-2 py-2 flex items-center justify-center flex-shrink-0 mt-auto" style={{ minHeight: '40px' }}>
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <a 
            href="mailto:contacto@mytanku.com" 
            className="hover:opacity-80 transition-opacity flex items-center justify-center p-1.5 cursor-pointer"
            title="contacto@mytanku.com"
            style={{ pointerEvents: 'auto' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: '#73FFA2' }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </a>
          <Link
            href="/terms"
            className="hover:opacity-80 transition-opacity flex items-center justify-center p-1.5 cursor-pointer"
            title="Términos y Condiciones"
            style={{ pointerEvents: 'auto' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: '#73FFA2' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </Link>
        </div>
      </div>
      </div>
    </aside>

    {/* Barra de navegación móvil - Solo visible en pantallas pequeñas (< md) */}
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-1"
      style={{ 
        backgroundColor: 'rgba(38, 38, 38, 0.9)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        minHeight: '50px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
      }}
    >
      {/* My TANKU */}
      <Link
        href="/feed"
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
          isActiveRoute('/feed') 
            ? 'opacity-100' 
            : 'opacity-50 hover:opacity-70'
        }`}
        style={{
          filter: isActiveRoute('/feed') 
            ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))' 
            : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))'
        }}
      >
        <Image
          src="/icons_tanku/tanku_logo_menu_MyTanku_verde.svg"
          alt="My TANKU"
          width={32}
          height={32}
          className="object-contain"
          style={{ width: '32px', height: '32px' }}
        />
      </Link>

      {/* Wishlist */}
      {isAuthenticated ? (
        <Link
          href="/wishlist"
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
            isActiveRoute('/wishlist') 
              ? 'opacity-100' 
              : 'opacity-50 hover:opacity-70'
          }`}
          style={{
            filter: isActiveRoute('/wishlist') 
              ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))' 
              : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))'
          }}
        >
          <Image
            src="/icons_tanku/tanku_logo_menu_whislist_verde.svg"
            alt="Wishlist"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg opacity-30 cursor-not-allowed">
          <Image
            src="/icons_tanku/tanku_logo_menu_whislist_verde.svg"
            alt="Wishlist"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </div>
      )}

      {/* Botón circular verde con + - Sobresale de la barra */}
      <button
        className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative -mt-5"
        style={{
          background: 'transparent',
          border: '3px solid #73FFA2',
          boxShadow: '0 0 16px rgba(115, 255, 162, 0.8), 0 0 24px rgba(115, 255, 162, 0.6)'
        }}
        title="Próximamente"
      >
        <span className="text-white text-7xl leading-none">+</span>
      </button>

      {/* StalkerGift */}
      {isAuthenticated ? (
        <Link
          href="/stalkergift"
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
            isActiveRoute('/stalkergift') 
              ? 'opacity-100' 
              : 'opacity-50 hover:opacity-70'
          }`}
          style={{
            filter: isActiveRoute('/stalkergift') 
              ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))' 
              : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))'
          }}
        >
          <Image
            src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
            alt="StalkerGift"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg opacity-30 cursor-not-allowed">
          <Image
            src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
            alt="StalkerGift"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </div>
      )}

      {/* Mi Perfil */}
      {isAuthenticated ? (
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
            isActiveRoute('/profile') 
              ? 'opacity-100' 
              : 'opacity-50 hover:opacity-70'
          }`}
          style={{
            filter: isActiveRoute('/profile') 
              ? 'drop-shadow(0 0 8px rgba(115, 255, 162, 0.8)) drop-shadow(0 0 12px rgba(115, 255, 162, 0.6))' 
              : 'drop-shadow(0 0 4px rgba(115, 255, 162, 0.5))'
          }}
        >
          <Image
            src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
            alt="Mi Perfil"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg opacity-30 cursor-not-allowed">
          <Image
            src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
            alt="Mi Perfil"
            width={32}
            height={32}
            className="object-contain"
            style={{ width: '32px', height: '32px' }}
          />
        </div>
      )}
    </nav>
    </>
  )
}
