'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import CircularMenu from './circular-menu'

export default function Sidebar() {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuthStore()
  const initialAvatar = user?.profile?.avatar || ''
  const [imgSrc, setImgSrc] = useState<string>(initialAvatar)

  useEffect(() => {
    setImgSrc(user?.profile?.avatar || '')
  }, [user?.profile?.avatar])

  const handleLogout = () => {
    logout()
    window.location.href = '/feed'
  }

  return (
    <aside 
      className="hidden lg:block fixed left-0 top-0 h-full w-60 z-50 flex flex-col"
      style={{ backgroundColor: '#2D3A3A' }}
    >
      <div className="w-60 flex flex-col h-full py-2 px-2 flex-shrink-0">
        {/* Logo Tanku */}
        <div className="flex items-start justify-between w-full mb-8 px-4 flex-shrink-0">
          <Image 
            src="/feed/logo-tanku.svg" 
            alt="Logo Tanku" 
            width={90} 
            height={90} 
            className="object-contain flex-shrink-0"
            priority={false}
            unoptimized
          />
          {/* Avatar con "¿Whats up?" - Solo visible si está autenticado */}
          {isAuthenticated && user && (
            <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group relative">
              <div className="relative">
                <div 
                  className="w-16 h-16 rounded-full p-0.5 group-hover:opacity-90 transition-opacity relative z-10"
                  style={{
                    background: 'linear-gradient(45deg, #1A485C, #73FFA2)'
                  }}
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
                {/* Textbox "¿Whats up?" */}
                <div 
                  className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 px-3 py-1.5 rounded-full min-w-[85px] group-hover:opacity-90 transition-opacity flex items-center justify-center z-0 cursor-pointer"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.45)',
                    color: '#73FFA2'
                  }}
                >
                  <span className="text-xs font-semibold whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    ¿Whats up?
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Menú vertical */}
        <div className="flex flex-col gap-1.5 flex-1 w-full px-2 pt-2 pb-2 overflow-y-auto min-h-0">
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
              <Link
                  href="/feed"
                className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <Image
                  src="/feed/Icons/Home_Green.png"
                  alt="My TANKU"
                  width={24}
                  height={24}
                  className="object-contain flex-shrink-0"
                />
                <span 
                  className="font-normal"
                  style={{ color: '#73FFA2', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                >
                  My TANKU
                </span>
              </Link>

              {/* Mi Perfil */}
              {isAuthenticated ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <Image
                    src="/feed/Icons/Profile_Green.png"
                    alt="Mi Perfil"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
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
                    src="/feed/Icons/Profile_Green.png"
                    alt="Mi Perfil"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0 opacity-50"
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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#73FFA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span 
                    className="font-normal"
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    Amigos
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
                    src="/feed/Icons/Shopping_Cart_Green.png"
                    alt="Wishlist"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0"
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
                    src="/feed/Icons/Shopping_Cart_Green.png"
                    alt="Wishlist"
                    width={24}
                    height={24}
                    className="object-contain flex-shrink-0 opacity-50"
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 30 33" fill="none">
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 30 33" fill="none" className="opacity-50">
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
                    style={{ color: '#666', fontFamily: 'Poppins, sans-serif', fontSize: '16px' }}
                  >
                    StalkerGift
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Área fija inferior */}
        <div className="flex-shrink-0 border-t border-gray-600 mt-auto">
          {/* Botón de Logout */}
          {isAuthenticated && user && (
            <div className="px-4 py-1.5">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors w-full text-left px-2 py-1.5 rounded-lg hover:bg-red-500/10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span 
                  className="font-normal"
                  style={{ fontFamily: 'Poppins, sans-serif', fontSize: '18px' }}
                >
                  Cerrar sesión
                </span>
              </button>
            </div>
          )}

          {/* Circular Menu */}
          <div className="flex items-center justify-center w-full pb-0.5 pt-0">
            <CircularMenu />
          </div>

          {/* Footer con información de contacto */}
          <div className="px-4 py-1.5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: '#73FFA2' }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <a 
                  href="mailto:contacto@mytanku.com" 
                  className="hover:text-greenTanku transition-colors break-all"
                  style={{ fontFamily: 'Poppins, sans-serif', fontSize: '13px' }}
                >
                  contacto@mytanku.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: '#73FFA2' }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <a 
                  href="tel:+573013363980" 
                  className="hover:text-greenTanku transition-colors whitespace-nowrap"
                  style={{ fontFamily: 'Poppins, sans-serif', fontSize: '13px' }}
                >
                  +57 301 3363980
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
