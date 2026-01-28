'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import type { PosterDTO } from '@/types/api'
import { PosterCard } from '@/components/feed/poster-card'
import { PosterDetailModal } from '@/components/posters/poster-detail-modal'
import Image from 'next/image'
import { ArrowLeftIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import { UserWishlistsTab } from '@/components/profile/user-wishlists-tab'
import { SocialLinksDisplay } from '@/components/profile/social-links-display'
import { useFriends } from '@/lib/hooks/use-friends'

type UserProfile = {
  id: string
  firstName: string | null
  lastName: string | null
  username: string | null
  profile: {
    avatar: string | null
    banner: string | null
    bio: string | null
    isPublic: boolean
    socialLinks?: Array<{ platform: string; url: string }>
  } | null
  isOwnProfile: boolean
  canViewProfile: boolean
  areFriends: boolean
  friendsCount?: number
}

export default function OtherUserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const username = params.username as string

  const [profileUser, setProfileUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'PUBLICACIONES' | 'WISHLISTS'>('PUBLICACIONES')
  const [posters, setPosters] = useState<any[]>([])
  const [isLoadingPosters, setIsLoadingPosters] = useState(false)
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false)
  const [postsCount, setPostsCount] = useState(0)
  const [friendsCount, setFriendsCount] = useState(0)
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [isRemovingFriend, setIsRemovingFriend] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { sendFriendRequest, removeFriend, blockUser, fetchSentRequests, sentRequests, fetchRequests, requests, acceptRequest, fetchFriends, friends } = useFriends()

  // Cargar información del usuario por username
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!username) return
      setIsLoading(true)
      try {
        const response = await apiClient.get<UserProfile>(API_ENDPOINTS.USERS.BY_USERNAME(username))
        if (response.success && response.data) {
          // Si es el perfil propio, redirigir a /profile para mostrar el perfil completo
          if (response.data.isOwnProfile || (currentUser?.id && currentUser.id === response.data.id)) {
            router.replace('/profile')
            return
          }
          
          setProfileUser(response.data)
          // Actualizar conteo de amigos desde la respuesta
          if (response.data.friendsCount !== undefined) {
            setFriendsCount(response.data.friendsCount)
          }
          
          // Si no puede ver el perfil, redirigir o mostrar mensaje
          if (!response.data.canViewProfile) {
            // Mostrar mensaje de perfil privado
          }
        }
      } catch (error) {
        console.error('Error cargando perfil:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadUserProfile()
  }, [username, router, currentUser?.id])

  // Cargar solicitudes enviadas, recibidas y amigos para verificar estado
  useEffect(() => {
    if (currentUser?.id && profileUser?.id) {
      fetchSentRequests()
      fetchRequests()
      fetchFriends()
    }
  }, [currentUser?.id, profileUser?.id, fetchSentRequests, fetchRequests, fetchFriends])

  // Recargar perfil cuando cambie el estado de amistad (para sincronizar con backend)
  useEffect(() => {
    const checkAndReloadProfile = async () => {
      if (!username || !currentUser?.id || !profileUser?.id) return
      
      const isFriendLocal = friends.some(f => f.friendId === profileUser.id || f.friend.id === profileUser.id)
      // Si localmente son amigos pero el backend dice que no, recargar perfil
      if (isFriendLocal && !profileUser.areFriends) {
        try {
          const response = await apiClient.get<UserProfile>(API_ENDPOINTS.USERS.BY_USERNAME(username))
          if (response.success && response.data) {
            setProfileUser(response.data)
            if (response.data.friendsCount !== undefined) {
              setFriendsCount(response.data.friendsCount)
            }
          }
        } catch (error) {
          console.error('Error recargando perfil:', error)
        }
      }
    }
    
    // Esperar un poco para que el backend procese la solicitud
    const timeoutId = setTimeout(checkAndReloadProfile, 500)
    return () => clearTimeout(timeoutId)
  }, [friends, profileUser?.id, profileUser?.areFriends, username, currentUser?.id])

  // El conteo de amigos ahora viene del backend en getUserById

  // Verificar si hay solicitud pendiente o si son amigos
  const userId = profileUser?.id
  const hasSentRequest = sentRequests.some(req => req.friendId === userId)
  const hasReceivedRequest = requests.some(req => req.userId === userId)
  const isFriend = friends.some(f => f.friendId === userId || f.friend.id === userId)
  
  // Usar areFriends del backend o isFriend del estado local como respaldo
  const areFriends = profileUser?.areFriends || isFriend
  const canViewContent = profileUser?.canViewProfile || areFriends

  const handleAcceptRequest = async () => {
    const request = requests.find(req => req.userId === userId)
    if (request) {
      setIsSendingRequest(true)
      try {
        await acceptRequest(request.id)
        await fetchFriends()
        await fetchRequests()
        // Recargar el perfil para actualizar canViewProfile y areFriends
        if (username) {
          const response = await apiClient.get<UserProfile>(API_ENDPOINTS.USERS.BY_USERNAME(username))
          if (response.success && response.data) {
            setProfileUser(response.data)
            if (response.data.friendsCount !== undefined) {
              setFriendsCount(response.data.friendsCount)
            }
          }
        }
      } catch (error) {
        console.error('Error aceptando solicitud:', error)
      } finally {
        setIsSendingRequest(false)
      }
    }
  }

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSendFriendRequest = async () => {
    if (!currentUser?.id || !userId) return
    setIsSendingRequest(true)
    try {
      await sendFriendRequest(userId)
      await fetchSentRequests()
    } catch (error) {
      console.error('Error enviando solicitud:', error)
    } finally {
      setIsSendingRequest(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${profileUser?.firstName || 'este amigo'}?`)) {
      return
    }
    if (!userId) return
    setIsRemovingFriend(true)
    try {
      await removeFriend(userId)
      await fetchFriends()
      setShowMenu(false)
      // Recargar el perfil para actualizar canViewProfile y areFriends
      if (username) {
        const response = await apiClient.get<UserProfile>(API_ENDPOINTS.USERS.BY_USERNAME(username))
        if (response.success && response.data) {
          setProfileUser(response.data)
          if (response.data.friendsCount !== undefined) {
            setFriendsCount(response.data.friendsCount)
          }
        }
      }
    } catch (error) {
      console.error('Error eliminando amigo:', error)
    } finally {
      setIsRemovingFriend(false)
    }
  }

  const handleBlock = async () => {
    if (!userId) return
    if (!confirm(`¿Estás seguro de que quieres bloquear a ${profileUser?.firstName || 'este usuario'}?`)) {
      return
    }
    setIsBlocking(true)
    try {
      await blockUser(userId)
      setShowMenu(false)
      router.back()
    } catch (error) {
      console.error('Error bloqueando usuario:', error)
    } finally {
      setIsBlocking(false)
    }
  }

  // Cargar posters del usuario
  useEffect(() => {
    const loadPosters = async () => {
      const userId = profileUser?.id
      const areFriendsLocal = profileUser?.areFriends || friends.some(f => f.friendId === userId || f.friend.id === userId)
      const canViewContentLocal = profileUser?.canViewProfile || areFriendsLocal
      // Si no puede ver el perfil y no son amigos, no cargar posters
      if (!userId || !canViewContentLocal) {
        setPosters([])
        setPostsCount(0)
        setIsLoadingPosters(false)
        return
      }
      setIsLoadingPosters(true)
      try {
        const response = await apiClient.get<PosterDTO[]>(API_ENDPOINTS.POSTERS.BY_USER(userId))
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
    }
    if (activeTab === 'PUBLICACIONES') {
      loadPosters()
    }
  }, [profileUser?.id, activeTab, profileUser?.canViewProfile, profileUser?.areFriends, friends, userId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#1E1E1E' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#1E1E1E' }}>
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Usuario no encontrado</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#73FFA2] text-gray-900 rounded-lg hover:bg-[#66DEDB] transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }


  const userName = profileUser.firstName && profileUser.lastName
    ? `${profileUser.firstName} ${profileUser.lastName}`
    : profileUser.username || 'Usuario'

  const bannerUrl = profileUser.profile?.banner || null
  const avatarUrl = profileUser.profile?.avatar || null

  return (
    <div className="min-h-screen w-full p-3 sm:p-4 md:p-6" style={{ backgroundColor: '#1E1E1E' }}>
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-5 md:space-y-6">
        {/* Sección principal - Dos columnas */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Columna principal - 75% */}
          <div className="flex-1 w-full md:w-3/4">
            {/* Banner */}
            <div className="w-full h-24 sm:h-28 md:h-48 bg-gradient-to-r from-[#1A485C] to-[#73FFA2] rounded-lg mb-3 sm:mb-4 overflow-hidden relative">
              {bannerUrl ? (
                <Image
                  src={bannerUrl}
                  alt={`Banner de ${userName}`}
                  fill
                  className="object-cover"
                  unoptimized={bannerUrl.startsWith('http')}
                />
              ) : null}
            </div>
            
            {/* Información del usuario */}
            <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={userName}
                          width={96}
                          height={96}
                          className="object-cover rounded-full w-full h-full"
                          unoptimized={avatarUrl.startsWith('http')}
                          onError={() => {}}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold">
                          {(profileUser.firstName?.[0] || profileUser.username?.[0] || 'U').toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    {profileUser.username ? (
                      <>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#73FFA2] break-words">
                          {profileUser.username}
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
                
                {/* Botón de menú (3 puntos) - solo si son amigos */}
                {currentUser?.id && userId !== currentUser.id && areFriends && (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-1.5 sm:p-2 rounded-full hover:bg-gray-700 transition-colors"
                      title="Más opciones"
                    >
                      <EllipsisVerticalIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#73FFA2]" />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                        <button
                          onClick={handleRemoveFriend}
                          disabled={isRemovingFriend}
                          className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50 rounded-t-lg"
                        >
                          {isRemovingFriend ? 'Eliminando...' : 'Eliminar amigo'}
                        </button>
                        <button
                          onClick={handleBlock}
                          disabled={isBlocking}
                          className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50 rounded-b-lg"
                        >
                          {isBlocking ? 'Bloqueando...' : 'Bloquear usuario'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Bio */}
              <p className="text-gray-300 text-xs sm:text-sm">
                {profileUser.profile?.bio || 'Miembro de la comunidad TANKU'}
              </p>
              
                {/* Botón de Mensaje - solo si son amigos */}
              {currentUser?.id && userId !== currentUser.id && areFriends && (
                <Link
                  href={`/messages?userId=${userId}`}
                  className="inline-block px-4 py-2 bg-[#66DEDB] hover:bg-[#73FFA2] text-gray-900 font-semibold rounded-lg transition-colors text-sm"
                >
                  Mensaje
                </Link>
              )}
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

            {/* Botones de acción */}
            {currentUser?.id && userId !== currentUser.id && (
              <div className="space-y-2 mb-6">
                {!isFriend && !hasSentRequest && !hasReceivedRequest && (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={isSendingRequest}
                    className="w-full px-4 py-2 bg-[#73FFA2] hover:bg-[#66e891] text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingRequest ? 'Enviando...' : 'Agregar amigo'}
                  </button>
                )}
                {hasSentRequest && (
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-gray-700 text-gray-400 font-semibold rounded-lg cursor-not-allowed"
                  >
                    Solicitud enviada
                  </button>
                )}
                {hasReceivedRequest && (
                  <button
                    onClick={handleAcceptRequest}
                    disabled={isSendingRequest}
                    className="w-full px-4 py-2 bg-[#73FFA2] hover:bg-[#66e891] text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingRequest ? 'Aceptando...' : 'Aceptar solicitud'}
                  </button>
                )}
              </div>
            )}

            {/* Redes sociales */}
            {profileUser.profile?.socialLinks && profileUser.profile.socialLinks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs sm:text-sm font-medium text-gray-400 mb-2">Redes Sociales</h4>
                <SocialLinksDisplay socialLinks={profileUser.profile.socialLinks} />
              </div>
            )}
          </div>
        </div>

        {/* Navegación de tabs */}
        <div className="flex justify-start sm:justify-center space-x-2 sm:space-x-3 md:space-x-8 border-b border-gray-600 pb-1.5 sm:pb-2 mb-3 sm:mb-4 md:mb-6 overflow-x-auto scrollbar-hide px-1">
          <button
            onClick={() => setActiveTab('PUBLICACIONES')}
            className={`px-1.5 sm:px-2 md:px-4 py-0.5 sm:py-1 md:py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'PUBLICACIONES'
                ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            PUBLICACIONES
          </button>
          <button
            onClick={() => setActiveTab('WISHLISTS')}
            className={`px-1.5 sm:px-2 md:px-4 py-0.5 sm:py-1 md:py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'WISHLISTS'
                ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            WISHLISTS
          </button>
        </div>

        {/* Contenido de los tabs */}
        {activeTab === 'PUBLICACIONES' && (
          <div className="w-full">
            {!canViewContent ? (
              <div className="flex flex-col items-center justify-center py-4 sm:py-6 md:py-12 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-700 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-white text-base sm:text-lg font-medium mb-1 sm:mb-2">Este perfil es privado</h3>
                <p className="text-gray-400 text-xs sm:text-sm">Solo los amigos pueden ver las publicaciones.</p>
              </div>
            ) : isLoadingPosters ? (
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

        {activeTab === 'WISHLISTS' && userId && (
          <div className="w-full">
            {/* Siempre renderizar UserWishlistsTab - el componente maneja la visibilidad de wishlists privadas */}
            <UserWishlistsTab userId={userId} canViewPrivate={areFriends} />
          </div>
        )}
      </div>

      {/* Modal de detalle de poster */}
      {isPosterModalOpen && selectedPosterId && (
        <PosterDetailModal
          posterId={selectedPosterId}
          isOpen={isPosterModalOpen}
          onClose={() => {
            setIsPosterModalOpen(false)
            setSelectedPosterId(null)
          }}
          onPostDeleted={() => {
            // Recargar posters
            const loadPosters = async () => {
              if (!userId) return
              setIsLoadingPosters(true)
              try {
                const response = await apiClient.get<PosterDTO[]>(API_ENDPOINTS.POSTERS.BY_USER(userId))
                if (response.success && response.data) {
                  setPosters(response.data)
                  setPostsCount(response.data.length)
                }
              } catch (error) {
                console.error('Error cargando posters:', error)
              } finally {
                setIsLoadingPosters(false)
              }
            }
            loadPosters()
          }}
        />
      )}
    </div>
  )
}
