'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useProfileNavigation } from '@/lib/context/profile-navigation-context'
import { ProfileNavigationProvider } from '@/lib/context/profile-navigation-context'
import { OrdersTab } from '@/components/profile/orders-tab'
import { RedTankuTab } from '@/components/profile/red-tanku-tab'
import { StalkerGiftOrdersTab } from '@/components/profile/stalkergift-orders-tab'
import { SettingsModal } from '@/components/profile/settings/settings-modal'
import { SocialLinksDisplay } from '@/components/profile/social-links-display'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import type { PosterDTO } from '@/types/api'
import { PosterCard } from '@/components/feed/poster-card'
import { CreatePostModal } from '@/components/posters/create-post-modal'
import { PosterDetailModal } from '@/components/posters/poster-detail-modal'
import Image from 'next/image'
import { Cog6ToothIcon, CameraIcon, PlusIcon } from '@heroicons/react/24/outline'


function ProfileContent() {
  const { user, checkAuth } = useAuthStore()
  const router = useRouter()
  const { activeTab, setActiveTab } = useProfileNavigation()
  
  // No redirigir - mostrar el perfil completo aquí
  const [orderId, setOrderId] = useState<string | null>(null)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [friendsCount, setFriendsCount] = useState<number>(0)
  const [postsCount, setPostsCount] = useState<number>(0)
  const [posters, setPosters] = useState<any[]>([])
  const [isLoadingPosters, setIsLoadingPosters] = useState(false)
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false)
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false)
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

  // Función para cargar posters
  const loadPosters = React.useCallback(async () => {
    if (!user?.id) return
    setIsLoadingPosters(true)
    try {
      const response = await apiClient.get<PosterDTO[]>(API_ENDPOINTS.POSTERS.BY_USER(user.id))
      if (response.success && response.data) {
        setPosters(response.data)
        setPostsCount(response.data.length)
      }
    } catch (error) {
      console.error('Error cargando posters:', error)
      setPosters([])
      setPostsCount(0)
    } finally {
      setIsLoadingPosters(false)
    }
  }, [user?.id])

  // Cargar posters del usuario
  useEffect(() => {
    loadPosters()
  }, [loadPosters])

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
                  
                  <div>
                    {user?.username ? (
                      <>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#73FFA2] break-words">
                          {user.username}
                        </h1>
                        {userName && userName !== 'Usuario' && (
                          <p className="text-gray-400 text-sm mt-1">{userName}</p>
                        )}
                      </>
                    ) : (
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#73FFA2] break-words">
                        {userName}
                      </h1>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
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
            {user?.profile?.socialLinks && user.profile.socialLinks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs sm:text-sm font-medium text-gray-400 mb-2">Redes Sociales</h4>
                <SocialLinksDisplay socialLinks={user.profile.socialLinks} />
              </div>
            )}
          </div>
        </div>

        {/* Navegación de tabs */}
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

        {/* Contenido de los tabs */}
        <>
          {activeTab === 'PUBLICACIONES' && (
              <div className="w-full">
                {/* Botón de crear post */}
                <div className="mb-4 sm:mb-6">
                  <button
                    onClick={() => setCreatePostModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#73FFA2] hover:bg-[#66e891] text-gray-900 font-semibold rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Crear Nuevo Post</span>
                  </button>
                </div>

                {isLoadingPosters ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2]"></div>
                  </div>
                ) : posters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 sm:py-6 md:py-12 text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-700 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-white text-base sm:text-lg font-medium mb-1 sm:mb-2">No hay publicaciones aún</h3>
                    <p className="text-gray-400 text-xs sm:text-sm">Las publicaciones aparecerán aquí cuando estén disponibles.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {posters.map((poster) => (
                      <PosterCard
                        key={poster.id}
                        poster={{
                          id: poster.id,
                          type: 'poster',
                          imageUrl: poster.imageUrl,
                          videoUrl: poster.videoUrl,
                          description: poster.description,
                          likesCount: poster.likesCount || 0,
                          commentsCount: poster.commentsCount || 0,
                          createdAt: poster.createdAt,
                          isLiked: poster.isLiked,
                          author: poster.author,
                        }}
                        onOpenModal={(poster) => {
                          setSelectedPosterId(poster.id)
                          setIsPosterModalOpen(true)
                        }}
                        isLightMode={false}
                      />
                    ))}
                  </div>
                )}
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
              <div className="w-full">
                <StalkerGiftOrdersTab userId={user.id} initialOrderId={orderId} />
              </div>
            )}
        </>

        {/* Modal de configuración */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onUpdate={() => {
            checkAuth()
          }}
        />

        {/* Modal de creación de post */}
        <CreatePostModal
          isOpen={createPostModalOpen}
          onClose={() => setCreatePostModalOpen(false)}
          onPostCreated={() => {
            setCreatePostModalOpen(false)
            // Recargar posters después de crear uno nuevo
            loadPosters()
          }}
        />

        {/* Modal de detalle de post */}
        <PosterDetailModal
          isOpen={isPosterModalOpen}
          posterId={selectedPosterId}
          onClose={() => {
            setIsPosterModalOpen(false)
            setSelectedPosterId(null)
          }}
        onPostDeleted={(posterId) => {
          // Remover el poster de la lista sin recargar todo
          setPosters(prev => prev.filter(p => p.id !== posterId))
          setPostsCount(prev => Math.max(0, prev - 1))
        }}
        onPostUpdated={(posterId, updates) => {
          // Actualizar solo ese poster sin recargar todo
          setPosters(prev => prev.map(p => 
            p.id === posterId ? { ...p, ...updates } : p
          ))
        }}
        />
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
