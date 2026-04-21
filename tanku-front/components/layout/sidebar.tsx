'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useChat } from '@/lib/hooks/use-chat'
import CircularMenu from './circular-menu'
import { CreateStoryModal } from '@/components/stories/create-story-modal'
import { useStories } from '@/lib/hooks/use-stories'
import { FEED_RESET_FILTERS_EVENT } from '@/lib/constants/feed-events'

/** Rail lg: ~80% del frame 260px Figma (densidad cercana a zoom navegador 80%) */
const SIDEBAR_LG_W = '208px'
/** Degradado horizontal al 20% sobre base sólida (equivalente Figma: fill degradado + opacidad 20%) */
const SIDEBAR_SURFACE_GRADIENT =
  'linear-gradient(90deg, rgba(77, 254, 250, 0.2) 0%, rgba(25, 30, 35, 0.2) 100%), #191E23'

export default function Sidebar() {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { getTotalUnreadCount, lastReceivedMessage, conversations } = useChat()
  const initialAvatar = user?.profile?.avatar || ''
  const [imgSrc, setImgSrc] = useState<string>(initialAvatar)
  const [createStoryModalOpen, setCreateStoryModalOpen] = useState(false)
  const { fetchFeedStories } = useStories()
  
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

  const handleFeedLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/feed' || pathname === '/') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent(FEED_RESET_FILTERS_EVENT))
    }
  }

  // Helper para verificar si una ruta está activa (incluye rutas anidadas)
  const isActiveRoute = (route: string) => {
    if (route === '/feed') {
      return pathname === '/feed' || pathname === '/'
    }
    return pathname === route || pathname.startsWith(route + '/')
  }

  /** Estado hover/activo: solo borde, sin relleno */
  function SidebarDesktopNavRow({
    href,
    disabled,
    onClick,
    active = false,
    icon,
    label,
  }: {
    href?: string
    disabled?: boolean
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
    active?: boolean
    icon: React.ReactNode
    label: string
  }) {
    /* Misma anchura que el bloque de títulos (contenedor padre); bordes tipo cápsula */
    const inner = (
      <span className="block w-full">
        <span
          className={`flex w-full rounded-full border bg-transparent transition-colors ${
            active ? 'border-[#73FFA2]/80' : 'border-transparent group-hover:border-[#73FFA2]/60'
          }`}
        >
          <span
            className={`flex w-full items-center gap-3 rounded-full px-3 py-[3px] transition-colors ${
              active ? 'bg-white/[0.06]' : 'bg-transparent group-hover:bg-white/[0.04]'
            }`}
          >
            {icon}
            <span
              className="leading-none text-[#73FFA2]"
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontSize: '14px',
                fontWeight: 400,
              }}
            >
              {label}
            </span>
          </span>
        </span>
      </span>
    )

    if (disabled) {
      return (
        <div
          className="w-full opacity-50"
          title="Inicia sesión para acceder"
        >
          {inner}
        </div>
      )
    }

    return (
      <Link href={href!} onClick={onClick} className="group block w-full">
        {inner}
      </Link>
    )
  }

  return (
    <>
      {/* Sidebar Desktop Completo - Solo visible en pantallas grandes (lg+) */}
      <aside
        className="fixed left-0 top-0 z-50 hidden h-full lg:flex lg:flex-col"
        style={{
          width: SIDEBAR_LG_W,
          background: SIDEBAR_SURFACE_GRADIENT,
        }}
      >
        <div
          className="flex h-full min-h-0 flex-shrink-0 flex-col px-1.5 py-1.5"
          style={{ width: SIDEBAR_LG_W }}
        >
          {/* Logo centrado; avatar solo con sesión (debajo del logo) */}
          <div className="flex w-full flex-shrink-0 flex-col items-center px-1 pb-1 pt-2">
            <Image
              src="/feed/logo-tanku.svg"
              alt="Logo Tanku"
              width={120}
              height={120}
              className="object-contain"
              style={{ width: '120px', height: '120px' }}
              priority={false}
              loading="eager"
              unoptimized
            />
            {isAuthenticated && user && (
              <div className="relative mt-2.5 flex cursor-pointer flex-col items-center">
                <div className="relative">
                  <div
                    className="group relative z-10 h-[60px] w-[60px] cursor-pointer overflow-hidden rounded-full bg-gray-800 transition-opacity hover:opacity-90"
                    onClick={() => setCreateStoryModalOpen(true)}
                  >
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt="Tu Historia"
                        width={60}
                        height={60}
                        className="h-full w-full object-cover"
                        priority
                        unoptimized={imgSrc.startsWith('http')}
                        onError={() => setImgSrc('')}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-base font-bold text-gray-400">
                        {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCreateStoryModalOpen(true)
                    }}
                    className="absolute -bottom-0.5 -right-0.5 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-[#191E23] bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] shadow-lg transition-transform hover:scale-110"
                    title="Crear historia"
                  >
                    <Image
                      src="/icons_tanku/tanku_%2B_avatar.svg"
                      alt=""
                      width={14}
                      height={14}
                      className="pointer-events-none h-3.5 w-3.5 object-contain"
                      unoptimized
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Menú: más separado del bloque logo/avatar */}
          <div className="custom-scrollbar flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-0 pb-1 pt-4">
            <div className="mb-0.5 px-1.5">
              <h3
                className="mb-1 font-medium text-[13px] leading-tight"
                style={{
                  color: '#66DEDB',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                }}
              >
                GivE-Commerce
              </h3>
              <div className="flex flex-col gap-2">
                <SidebarDesktopNavRow
                  href="/feed"
                  disabled={!isAuthenticated}
                  onClick={handleFeedLinkClick}
                  active={isActiveRoute('/feed')}
                  label="My TANKU"
                  icon={
                    <Image
                      src="/icons_tanku/tanku_logo_menu_MyTanku_verde.svg"
                      alt=""
                      width={26}
                      height={26}
                      className="h-[26px] w-[26px] flex-shrink-0 object-contain"
                    />
                  }
                />
                <SidebarDesktopNavRow
                  href="/profile"
                  disabled={!isAuthenticated}
                  active={isActiveRoute('/profile')}
                  label="Mi perfil"
                  icon={
                    <Image
                      src="/icons_tanku/tanku_logo_menu_miperfil_verde.svg"
                      alt=""
                      width={26}
                      height={26}
                      className="h-[26px] w-[26px] flex-shrink-0 object-contain"
                    />
                  }
                />
                <SidebarDesktopNavRow
                  href="/friends"
                  disabled={!isAuthenticated}
                  active={isActiveRoute('/friends')}
                  label="Amigos"
                  icon={
                    <Image
                      src="/icons_tanku/tanku_logo_menu_Amigos_verde.svg"
                      alt=""
                      width={26}
                      height={26}
                      className="h-[26px] w-[26px] flex-shrink-0 object-contain"
                    />
                  }
                />
                <SidebarDesktopNavRow
                  href="/messages"
                  disabled={!isAuthenticated}
                  active={isActiveRoute('/messages')}
                  label="Mensajes"
                  icon={
                    <div className="relative flex-shrink-0">
                      <Image
                        src="/icons_tanku/tanku_logo_menu_mensajes_verde.svg"
                        alt=""
                        width={26}
                        height={26}
                        className="h-[26px] w-[26px] object-contain"
                      />
                      {totalUnread > 0 && (
                        <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#191E23] bg-[#66DEDB]">
                          <span className="text-[8px] font-bold leading-none text-[#1E1E1E]">
                            {totalUnread > 9 ? '9+' : totalUnread}
                          </span>
                        </div>
                      )}
                    </div>
                  }
                />
                <SidebarDesktopNavRow
                  href="/wishlist"
                  disabled={!isAuthenticated}
                  active={isActiveRoute('/wishlist')}
                  label="Wishlist"
                  icon={
                    <Image
                      src="/icons_tanku/tanku_logo_menu_whislist_verde.svg"
                      alt=""
                      width={26}
                      height={26}
                      className="h-[26px] w-[26px] flex-shrink-0 object-contain"
                    />
                  }
                />
              </div>
            </div>

            <div className="mb-0.5 mt-1 px-1.5">
              <h3
                className="mb-1 font-medium text-[13px] leading-tight"
                style={{
                  color: '#66DEDB',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                }}
              >
                Servicios
              </h3>
              <div className="flex flex-col gap-2">
                <SidebarDesktopNavRow
                  href="/stalkergift"
                  disabled={!isAuthenticated}
                  active={isActiveRoute('/stalkergift')}
                  label="StalkerGift"
                  icon={
                    <Image
                      src="/icons_tanku/tanku_logo_menu_stalkergift_verde.svg"
                      alt=""
                      width={26}
                      height={26}
                      className="h-[26px] w-[26px] flex-shrink-0 object-contain"
                    />
                  }
                />
              </div>
            </div>
          </div>

        {/* Circular Menu — escala ~80% para alinear con densidad del rail */}
        <div
          className="flex w-full flex-shrink-0 items-center justify-center"
          style={{ minHeight: '112px', position: 'relative', zIndex: 0 }}
        >
          <div className="origin-center scale-[0.82]">
            <CircularMenu />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex flex-shrink-0 items-center justify-center px-2 py-1.5"
          style={{ minHeight: '36px', position: 'relative', zIndex: 10 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
              <a 
                href="mailto:contacto@mytanku.com" 
                className="hover:opacity-80 transition-opacity flex items-center justify-center p-1.5 cursor-pointer"
                title="contacto@mytanku.com"
                style={{ pointerEvents: 'auto' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: '#73FFA2' }}>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: '#73FFA2' }}>
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
          fetchFeedStories()
        }}
      />
    </aside>

    {/* Sidebar Compacto (con títulos) - Visible en pantallas medianas (md a lg) */}
    <aside
      className="fixed left-0 top-0 z-50 hidden h-full w-36 flex-col py-2 px-2 md:flex md:flex-col lg:hidden"
      style={{
        background: SIDEBAR_SURFACE_GRADIENT,
      }}
    >
      {/* Logo Tanku - Agrandado */}
      <div className="mb-4 flex justify-center flex-shrink-0" style={{ minHeight: '78px' }}>
        <Image 
          src="/feed/logo-tanku.svg" 
          alt="Logo Tanku" 
          width={96} 
          height={96} 
          className="object-contain"
          style={{ width: '96px', height: '96px' }}
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
              className="h-14 w-14 rounded-full overflow-hidden bg-gray-800 group-hover:opacity-90 transition-opacity relative z-10 cursor-pointer"
              onClick={() => setCreateStoryModalOpen(true)}
            >
              {imgSrc ? (
                <Image
                  src={imgSrc}
                  alt="Tu Historia"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  priority
                  unoptimized={imgSrc.startsWith('http')}
                  onError={() => setImgSrc('')}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-base font-bold">
                  {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
            {/* Botón "+" verde Tanku */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCreateStoryModalOpen(true)
              }}
              className="absolute -bottom-1 -right-1 h-6 w-6 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] rounded-full flex items-center justify-center border-2 border-[#191E23] hover:scale-110 transition-transform cursor-pointer z-20 shadow-lg"
              title="Crear historia"
            >
              <Image
                src="/icons_tanku/tanku_%2B_avatar.svg"
                alt=""
                width={14}
                height={14}
                className="pointer-events-none h-3.5 w-3.5 object-contain"
                unoptimized
              />
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
                onClick={handleFeedLinkClick}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors ${
                  isActiveRoute('/feed')
                    ? 'border-[#73FFA2]/80 bg-white/[0.06] opacity-100'
                    : 'border-transparent bg-transparent opacity-70 hover:border-[#73FFA2]/60 hover:bg-white/[0.04]'
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
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors ${
                    isActiveRoute('/profile')
                      ? 'border-[#73FFA2]/80 bg-white/[0.06] opacity-100'
                      : 'border-transparent bg-transparent opacity-70 hover:border-[#73FFA2]/60 hover:bg-white/[0.04]'
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
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors ${
                    isActiveRoute('/friends')
                      ? 'border-[#73FFA2]/80 bg-white/[0.06] opacity-100'
                      : 'border-transparent bg-transparent opacity-70 hover:border-[#73FFA2]/60 hover:bg-white/[0.04]'
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
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors relative ${
                    isActiveRoute('/messages')
                      ? 'border-[#73FFA2]/80 bg-white/[0.06] opacity-100'
                      : 'border-transparent bg-transparent opacity-70 hover:border-[#73FFA2]/60 hover:bg-white/[0.04]'
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
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors ${
                    isActiveRoute('/wishlist')
                      ? 'border-[#73FFA2]/80 bg-white/[0.06] opacity-100'
                      : 'border-transparent bg-transparent opacity-70 hover:border-[#73FFA2]/60 hover:bg-white/[0.04]'
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
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors ${
                    isActiveRoute('/stalkergift')
                      ? 'border-[#73FFA2]/80 bg-white/[0.06] opacity-100'
                      : 'border-transparent bg-transparent opacity-70 hover:border-[#73FFA2]/60 hover:bg-white/[0.04]'
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
    </>
  )
}
