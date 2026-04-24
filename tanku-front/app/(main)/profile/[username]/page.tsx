'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { apiClient } from '@/lib/api/client'
import type { PosterDTO } from '@/types/api'
import { PosterCard } from '@/components/feed/poster-card'
import Image from 'next/image'
import { ArrowLeftIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import { UserWishlistsTab } from '@/components/profile/user-wishlists-tab'
import { SocialLinksDisplay } from '@/components/profile/social-links-display'
import { OtherProfileInsights } from '@/components/profile/other-profile-insights'
import type { ProfileInsightsDTO } from '@/types/api'
import { useFriends } from '@/lib/hooks/use-friends'
import { BaseNav } from '@/components/layout/base-nav'
import { clsx } from 'clsx'

function ProfileWishlistTabFromQuery({
  setActiveTab,
}: {
  setActiveTab: React.Dispatch<React.SetStateAction<'PUBLICACIONES' | 'WISHLISTS'>>
}) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const raw = searchParams.get('tab')
    if (raw?.toLowerCase() === 'wishlists') {
      setActiveTab('WISHLISTS')
    }
  }, [searchParams, setActiveTab])
  return null
}

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
  profileInsights?: ProfileInsightsDTO
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
  const [postsCount, setPostsCount] = useState(0)
  const [friendsCount, setFriendsCount] = useState(0)
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [isRemovingFriend, setIsRemovingFriend] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const {
    sendFriendRequest,
    removeFriend,
    blockUser,
    fetchSentRequests,
    sentRequests,
    fetchRequests,
    requests,
    acceptRequest,
    fetchFriends,
    friends,
    cancelSentRequest,
  } = useFriends()

  /** Evita mostrar "Enviar solicitud" / redes antes de alinear API de amistad + perfil (token + lista de amigos). */
  const [friendshipUiReady, setFriendshipUiReady] = useState(false)

  // Invitado: no hay datos de amistad que esperar
  useEffect(() => {
    if (!currentUser?.id) {
      setFriendshipUiReady(true)
    }
  }, [currentUser?.id])

  // Al cambiar de usuario o sesión, reset hasta completar sincronización
  useEffect(() => {
    if (currentUser?.id) {
      setFriendshipUiReady(false)
    }
  }, [currentUser?.id, username])

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

  // Tras tener perfil + sesión: lista de amigos/solicitudes y segundo GET de perfil (areFriends + socialLinks coherentes)
  useEffect(() => {
    if (!currentUser?.id || !profileUser?.id || !username) return

    let cancelled = false

    const syncFriendshipAndProfile = async () => {
      try {
        await Promise.all([fetchFriends(), fetchSentRequests(), fetchRequests()])
        if (cancelled) return
        const response = await apiClient.get<UserProfile>(API_ENDPOINTS.USERS.BY_USERNAME(username))
        if (cancelled || !response.success || !response.data) return
        setProfileUser(response.data)
        if (response.data.friendsCount !== undefined) {
          setFriendsCount(response.data.friendsCount)
        }
      } catch (e) {
        console.error('Error sincronizando amistad/perfil:', e)
      } finally {
        if (!cancelled) setFriendshipUiReady(true)
      }
    }

    syncFriendshipAndProfile()
    return () => {
      cancelled = true
    }
  }, [
    currentUser?.id,
    profileUser?.id,
    username,
    fetchFriends,
    fetchSentRequests,
    fetchRequests,
  ])

  // Si la lista local marca amistad pero el perfil venía desactualizado, alinear con el servidor
  useEffect(() => {
    const checkAndReloadProfile = async () => {
      if (!username || !currentUser?.id || !profileUser?.id) return

      const isFriendLocal = friends.some(
        (f) => f.friendId === profileUser.id || f.friend.id === profileUser.id
      )
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

    const timeoutId = setTimeout(checkAndReloadProfile, 400)
    return () => clearTimeout(timeoutId)
  }, [friends, profileUser?.id, profileUser?.areFriends, username, currentUser?.id])

  // El conteo de amigos ahora viene del backend en getUserById

  // Verificar si hay solicitud pendiente o si son amigos
  const userId = profileUser?.id
  const hasSentRequest = sentRequests.some(req => req.friendId === userId)
  const pendingSentRequest = sentRequests.find((req) => req.friendId === userId)
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

  const handleCancelSentRequest = async () => {
    if (!pendingSentRequest?.id || !username) return
    setIsSendingRequest(true)
    try {
      await cancelSentRequest(pendingSentRequest.id)
      await fetchSentRequests()
      const response = await apiClient.get<UserProfile>(API_ENDPOINTS.USERS.BY_USERNAME(username))
      if (response.success && response.data) {
        setProfileUser(response.data)
        if (response.data.friendsCount !== undefined) {
          setFriendsCount(response.data.friendsCount)
        }
      }
    } catch (error) {
      console.error('Error cancelando solicitud:', error)
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
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}>
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
    <div
      className={clsx(
        'relative z-0 flex min-h-0 min-w-0 w-full flex-1 flex-col',
        'max-md:overflow-y-visible max-md:overflow-x-hidden',
        'md:overflow-hidden',
      )}
    >
      <Suspense fallback={null}>
        <ProfileWishlistTabFromQuery setActiveTab={setActiveTab} />
      </Suspense>
      <div className="pointer-events-none relative z-40 shrink-0 h-0 overflow-visible">
        <BaseNav
          showStories={false}
          canHide={false}
          isVisible={true}
          pageTitle={profileUser.username || userName}
          pageTitleColor="#66DEDB"
          mobileBackCenterTitleCartOnly
          mobileTranslucentNav
          className="pointer-events-auto"
        />
      </div>
      <div
        className={clsx(
          'relative z-0 flex min-h-0 min-w-0 w-full flex-1 flex-col',
          'max-md:overflow-y-visible max-md:overflow-x-hidden',
          'md:overflow-hidden',
        )}
        id="profile-public-scroll-root"
      >
        <div
          className={clsx(
            'custom-scrollbar min-h-0 w-full',
            'max-md:flex-none max-md:overflow-x-hidden max-md:overflow-y-visible max-md:overscroll-y-auto',
            'md:flex-1 md:basis-0 md:overflow-y-auto md:overflow-x-hidden md:overscroll-y-contain',
            'md:touch-pan-y md:[-webkit-overflow-scrolling:touch]',
            'max-md:px-3 max-md:pt-[max(6.25rem,calc(env(safe-area-inset-top,0px)+5.25rem))] max-md:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:p-6 md:pt-20',
          )}
          style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
        >
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-5 md:space-y-6">
        {/* Sección principal - Dos columnas */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Columna principal - 75% */}
          <div className="flex-1 w-full md:w-3/4">
            {/* Banner */}
            <div className="w-full h-32 sm:h-36 md:h-56 bg-gradient-to-r from-[#1A485C] to-[#73FFA2] rounded-[25px] mb-3 sm:mb-4 overflow-hidden relative">
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
            <div className="space-y-2 sm:space-y-2.5 md:space-y-3 -mt-10 sm:-mt-12 md:-mt-14 relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 sm:gap-3 ml-4 sm:ml-6 md:ml-10">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="p-[5px] sm:p-[6px] rounded-full bg-[linear-gradient(180deg,#73FFA2_0%,#1A485C_100%)]">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
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
                  </div>
                  
                  <div className="pt-10 sm:pt-11 md:pt-14">
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
                
                {currentUser?.id && userId !== currentUser.id && friendshipUiReady && (
                  <div className="flex items-center gap-2 mt-10 sm:mt-11 md:mt-14">
                    {areFriends && (
                      <Link
                        href={`/messages?userId=${userId}`}
                        className="inline-block px-3 sm:px-4 py-1 rounded-full text-[11px] sm:text-xs font-semibold text-black transition-opacity hover:opacity-90 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)]"
                        style={{ background: 'linear-gradient(90deg, #73FFA2 0%, #1A485C 100%)' }}
                      >
                        Mensaje
                      </Link>
                    )}
                    {areFriends && (
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
                )}
              </div>
              
              {/* Bio */}
              <p className="text-gray-300 text-xs sm:text-sm">
                {profileUser.profile?.bio || 'Miembro de la comunidad TANKU'}
              </p>
              
              {/* Mensaje se muestra arriba a la derecha, en la zona de Editar perfil */}
            </div>
          </div>

          {/* Columna lateral - 25% */}
          <div className="w-full md:w-1/4 mt-3 sm:mt-4 md:mt-0">
            {/* Estadísticas */}
            <div
              className="text-center space-y-0.5 mb-6 rounded-[15px] py-2 px-3 sm:py-2.5 sm:px-3.5"
              style={{ background: 'linear-gradient(135deg, #73FFA2 0%, #4A6153 20%, #4A6153 81%, #73FFA2 100%)' }}
            >
              <div className="grid grid-cols-2 items-center px-1 sm:px-2">
                <div>
                  <p className="text-lg sm:text-xl md:text-xl font-bold text-white">{friendsCount}</p>
                  <p className="text-[#73FFA2] text-xs sm:text-sm md:text-xs font-semibold">Amigos</p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl md:text-xl font-bold text-white">{postsCount}</p>
                  <p className="text-[#73FFA2] text-xs sm:text-sm md:text-xs font-semibold">Publicaciones</p>
                </div>
              </div>
            </div>

            {/* Botones de acción — solo tras sincronizar amistad (evita flash "Agregar" si ya son amigos) */}
            {currentUser?.id && userId !== currentUser.id && friendshipUiReady && (
              <div className="space-y-2 mb-6">
                {!areFriends && !hasSentRequest && !hasReceivedRequest && (
                  <button
                    type="button"
                    onClick={handleSendFriendRequest}
                    disabled={isSendingRequest}
                    className="flex min-h-[2.75rem] w-full items-center justify-center rounded-[22px] border border-[#5bbf8a]/80 bg-[#73FFA2] px-4 py-2.5 text-sm font-semibold leading-snug text-gray-900 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-[opacity,transform] hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSendingRequest ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                )}
                {!areFriends && hasSentRequest && (
                  <button
                    type="button"
                    onClick={handleCancelSentRequest}
                    disabled={isSendingRequest || !pendingSentRequest}
                    className="flex min-h-[2.75rem] w-full items-center justify-center rounded-[22px] border border-red-400/45 bg-red-500/15 px-4 py-2.5 text-sm font-semibold leading-snug text-red-200 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition-colors hover:bg-red-500/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSendingRequest ? 'Cancelando...' : 'Cancelar solicitud'}
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

            {/* Redes sociales — solo si son amigos y el usuario las configuró */}
            {friendshipUiReady &&
              areFriends &&
              profileUser.profile?.socialLinks &&
              profileUser.profile.socialLinks.length > 0 && (
                <div
                  className="space-y-2 rounded-[15px] border border-[#73FFA2]/40 bg-[#171B21]/95 px-3 py-3 sm:px-3.5 sm:py-3.5 mb-6"
                  style={{
                    boxShadow: 'inset 0 1px 0 rgba(115,255,162,0.12)',
                  }}
                >
                  <h4 className="text-center text-sm font-semibold text-[#73FFA2] md:text-left mb-2">
                    Redes sociales
                  </h4>
                  <div className="flex justify-center md:justify-start">
                    <SocialLinksDisplay socialLinks={profileUser.profile.socialLinks} />
                  </div>
                </div>
              )}

            {/* Coincidencias tipo sugerencias — visitante logueado y aún no amigos */}
            {friendshipUiReady &&
              !areFriends &&
              currentUser?.id &&
              profileUser.profileInsights &&
              profileUser.id !== currentUser.id && (
                <OtherProfileInsights insights={profileUser.profileInsights} />
              )}

            {currentUser?.id && userId !== currentUser.id && !friendshipUiReady && (
              <div
                className="mb-6 h-24 animate-pulse rounded-[15px] bg-gray-700/40"
                aria-busy
                aria-label="Cargando datos de contacto"
              />
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
                : 'text-[#66DEDB] hover:text-[#73FFA2]'
            }`}
          >
            PUBLICACIONES
          </button>
          <button
            onClick={() => setActiveTab('WISHLISTS')}
            className={`px-1.5 sm:px-2 md:px-4 py-0.5 sm:py-1 md:py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'WISHLISTS'
                ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                : 'text-[#66DEDB] hover:text-[#73FFA2]'
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-1 sm:gap-1.5 md:gap-2">
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
                      router.push(`/posts/${poster.id}?from=profile`)
                    }}
                    isLightMode={false}
                    variant="profile"
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
      </div>
      </div>
    </div>
  )
}
