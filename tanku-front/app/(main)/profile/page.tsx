'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useProfileNavigation } from '@/lib/context/profile-navigation-context'
import { ProfileNavigationProvider } from '@/lib/context/profile-navigation-context'
import { OrdersTab } from '@/components/profile/orders-tab'
import { RedTankuTab } from '@/components/profile/red-tanku-tab'
import { PersonalInfoSection } from '@/components/profile/settings/personal-info-section'
import { OnboardingSection } from '@/components/profile/settings/onboarding-section'
import { AddressesSection } from '@/components/profile/settings/addresses-section'
import { PrivacySection } from '@/components/profile/settings/privacy-section'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import Image from 'next/image'
import { Cog6ToothIcon, CameraIcon } from '@heroicons/react/24/outline'

function SettingsContent({ onUpdate }: { onUpdate?: () => void }) {
  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <PersonalInfoSection onUpdate={onUpdate} />
      <OnboardingSection onUpdate={onUpdate} />
      <AddressesSection onUpdate={onUpdate} />
      <PrivacySection onUpdate={onUpdate} />
    </div>
  )
}

function ProfileContent() {
  const { user, checkAuth } = useAuthStore()
  const { activeTab, setActiveTab } = useProfileNavigation()
  const [orderId, setOrderId] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [friendsCount, setFriendsCount] = useState<number>(0)
  const [postsCount, setPostsCount] = useState<number>(0)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  
  // Usar el avatar de user_profiles.avatar si existe (similar a suggestion-card)
  // IMPORTANTE: Todos los hooks deben estar antes de cualquier return condicional
  const initialAvatar = user?.profile?.avatar || ''
  const [imgSrc, setImgSrc] = useState<string>(initialAvatar)

  const tabs: Array<'PUBLICACIONES' | 'Red Tanku' | 'MIS COMPRAS' | 'STALKER GIFTS'> = [
    'PUBLICACIONES',
    'Red Tanku',
    'MIS COMPRAS',
    'STALKER GIFTS'
  ]

  // Cargar contador de amigos
  // Leer orderId desde la URL
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    const orderIdParam = urlParams.get('orderId')
    setOrderId(orderIdParam)
  }, [])

  useEffect(() => {
    const loadFriendsCount = async () => {
      if (!user?.id) return
      try {
        const response = await apiClient.get<{ friends: any[]; count: number }>(API_ENDPOINTS.FRIENDS.LIST)
        if (response.success && response.data) {
          setFriendsCount(response.data.count || response.data.friends?.length || 0)
        }
      } catch (error) {
        console.error('Error al cargar contador de amigos:', error)
      }
    }
    loadFriendsCount()
  }, [user?.id])

  // Sincronizar imgSrc cuando cambie el avatar del usuario
  useEffect(() => {
    setImgSrc(user?.profile?.avatar || '')
  }, [user?.profile?.avatar])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  const userName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.email?.split('@')[0] || 'Usuario'
  
  const bannerUrl = user.profile?.banner || null

  // Funciones para cambiar avatar y banner
  const handleAvatarSelect = () => {
    avatarInputRef.current?.click()
  }

  const handleBannerSelect = () => {
    bannerInputRef.current?.click()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen debe ser menor a 5MB')
      return
    }

    setIsUploadingAvatar(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const authStore = useAuthStore.getState()
      const token = authStore.token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
      
      const response = await fetch(`${API_URL}${API_ENDPOINTS.USERS.PROFILE_AVATAR}`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()
      
      if (data.success || response.ok) {
        await checkAuth()
        setUploadError(null) // Limpiar error si fue exitoso
      } else {
        const errorMsg = data.error?.message || data.message || 'Error al actualizar avatar'
        setUploadError(errorMsg)
        setTimeout(() => setUploadError(null), 5000) // Ocultar error después de 5 segundos
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Error al actualizar avatar'
      setUploadError(errorMsg)
      setTimeout(() => setUploadError(null), 5000) // Ocultar error después de 5 segundos
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen debe ser menor a 5MB')
      return
    }

    setIsUploadingBanner(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('banner', file)

      const authStore = useAuthStore.getState()
      const token = authStore.token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'
      
      const response = await fetch(`${API_URL}${API_ENDPOINTS.USERS.PROFILE_BANNER}`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()
      
      if (data.success || response.ok) {
        await checkAuth()
        setUploadError(null) // Limpiar error si fue exitoso
      } else {
        const errorMsg = data.error?.message || data.message || 'Error al actualizar banner'
        setUploadError(errorMsg)
        setTimeout(() => setUploadError(null), 5000) // Ocultar error después de 5 segundos
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Error al actualizar banner'
      setUploadError(errorMsg)
      setTimeout(() => setUploadError(null), 5000) // Ocultar error después de 5 segundos
    } finally {
      setIsUploadingBanner(false)
      if (bannerInputRef.current) {
        bannerInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="min-h-screen w-full p-3 sm:p-4 md:p-6" style={{ backgroundColor: '#1E1E1E' }}>
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-5 md:space-y-6">
        {/* Sección principal - Dos columnas */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Columna principal - 75% */}
          <div className="flex-1 w-full md:w-3/4">
            {/* Banner */}
            <div className="w-full h-24 sm:h-28 md:h-48 bg-gradient-to-r from-[#1A485C] to-[#73FFA2] rounded-lg mb-3 sm:mb-4 overflow-hidden relative group">
              {bannerUrl ? (
                <Image
                  src={bannerUrl}
                  alt="Banner de perfil"
                  fill
                  className="object-cover"
                  unoptimized={bannerUrl.startsWith('http')}
                />
              ) : null}
              
              {/* Botón para cambiar el banner */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleBannerSelect}
                  disabled={isUploadingBanner}
                  className="bg-white/80 hover:bg-white text-black text-sm sm:text-base font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingBanner ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <CameraIcon className="w-4 h-4" />
                      {bannerUrl ? 'Cambiar Banner' : 'Subir Banner'}
                    </>
                  )}
                </button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                  disabled={isUploadingBanner}
                />
              </div>
            </div>
            
            {/* Mensaje de error para avatar/banner */}
            {uploadError && (
              <div className="mb-4 bg-red-900/20 border border-red-400/30 text-red-400 px-4 py-2 rounded text-sm">
                {uploadError}
              </div>
            )}
            
            {/* Información del usuario */}
            {!isEditingProfile ? (
              <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Avatar */}
                    <div className="relative group flex-shrink-0">
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center ${isUploadingAvatar ? 'opacity-50' : ''}`}>
                        {imgSrc ? (
                          <Image
                            src={imgSrc}
                            alt="Avatar del usuario"
                            width={96}
                            height={96}
                            className="object-cover rounded-full w-full h-full"
                            unoptimized={imgSrc.startsWith('http')}
                            onError={() => setImgSrc('')}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold">
                            {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Botón de editar avatar */}
                      <button
                        onClick={handleAvatarSelect}
                        disabled={isUploadingAvatar}
                        className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-[#73FFA2] rounded-full flex items-center justify-center shadow-lg hover:bg-[#66e891] transition-all duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Cambiar avatar"
                      >
                        {isUploadingAvatar ? (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <CameraIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-800" />
                        )}
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={isUploadingAvatar}
                      />
                    </div>
                    
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#73FFA2] break-words">
                      {userName}
                    </h1>
                  </div>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="p-1.5 sm:p-2 rounded-full hover:bg-gray-700 transition-colors"
                    title="Configuración"
                  >
                    <Cog6ToothIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#73FFA2]" />
                  </button>
                </div>
                
                <p className="text-gray-300 text-xs sm:text-sm">
                  {user.profile?.bio || 'Miembro de la comunidad TANKU'}
                </p>
                <p className="text-gray-400 text-xs sm:text-sm flex items-center gap-1">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Bogotá, Colombia
                </p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
                  <div>
                    <h2 className="text-xl sm:text-xl md:text-2xl font-bold text-[#73FFA2] mb-0.5 sm:mb-1">
                      Configuración
                    </h2>
                    <p className="text-white text-xs sm:text-sm">
                      Edita tu información personal
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="p-1.5 sm:p-2 rounded-full hover:bg-gray-700 transition-colors"
                    title="Cerrar configuración"
                  >
                    <Cog6ToothIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  </button>
                </div>
                
                {/* Secciones de configuración */}
                <SettingsContent onUpdate={() => {
                  // Actualizar usuario cuando se actualicen los datos
                  checkAuth()
                }} />
              </div>
            )}
          </div>

          {/* Columna lateral - 25% */}
          <div className="w-full md:w-1/4 mt-3 sm:mt-4 md:mt-0">
            {/* Estadísticas */}
            <div className="text-center space-y-1 sm:space-y-2 mb-6">
              <div className="flex justify-center space-x-4 sm:space-x-6">
                <div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#73FFA2]">{friendsCount}</p>
                  <p className="text-gray-400 text-xs sm:text-sm">Amigos</p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#73FFA2]">{postsCount}</p>
                  <p className="text-gray-400 text-xs sm:text-sm">Publicaciones</p>
                </div>
              </div>
            </div>

            {/* Redes sociales */}
            <div className="space-y-2">
              <h4 className="text-xs sm:text-sm font-medium text-gray-400 mb-2">Redes Sociales</h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">f</span>
                  </div>
                  <span className="text-xs text-gray-300">Facebook</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">ig</span>
                  </div>
                  <span className="text-xs text-gray-300">Instagram</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-gray-300">Twitter</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-gray-300">YouTube</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación de tabs - Solo mostrar si no está editando perfil */}
        {!isEditingProfile && (
          <div className="flex justify-start sm:justify-center space-x-2 sm:space-x-3 md:space-x-8 border-b border-gray-600 pb-1.5 sm:pb-2 mb-3 sm:mb-4 md:mb-6 overflow-x-auto scrollbar-hide px-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-1.5 sm:px-2 md:px-4 py-0.5 sm:py-1 md:py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Contenido de los tabs - Solo mostrar si no está editando perfil */}
        {!isEditingProfile && (
          <>
            {activeTab === 'PUBLICACIONES' && (
              <div className="flex flex-col items-center justify-center py-4 sm:py-6 md:py-12 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-700 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-white text-base sm:text-lg font-medium mb-1 sm:mb-2">No hay publicaciones aún</h3>
                <p className="text-gray-400 text-xs sm:text-sm">Las publicaciones aparecerán aquí cuando estén disponibles.</p>
              </div>
            )}
          
            {activeTab === 'Red Tanku' && user?.id && (
              <div className="w-full">
                <RedTankuTab userId={user.id} />
              </div>
            )}
            
            {activeTab === 'MIS COMPRAS' && user?.id && (
              <div className="w-full">
                <OrdersTab userId={user.id} initialOrderId={orderId} />
              </div>
            )}
            
            {activeTab === 'STALKER GIFTS' && user?.id && (
              <div className="flex flex-col items-center justify-center py-4 sm:py-6 md:py-12 text-center">
                <div className="text-center text-gray-400">
                  <p>Contenido de STALKER GIFTS se agregará próximamente</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProfileNavigationProvider>
      <ProfileContent />
    </ProfileNavigationProvider>
  )
}
