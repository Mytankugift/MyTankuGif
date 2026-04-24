/**
 * Página de Amigos
 * Gestiona solicitudes, lista de amigos y sugerencias
 */

'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import { useFriends } from '@/lib/hooks/use-friends'
import { useFeedInit } from '@/lib/hooks/use-feed-init'
import { useFeedScrollNav } from '@/lib/hooks/use-feed-scroll-nav'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { FriendsTabs } from '@/components/friends/friends-tabs'
import { FriendsList } from '@/components/friends/friends-list'
import { FriendRequestList } from '@/components/friends/friend-request-list'
import { SentRequestsList } from '@/components/friends/sent-requests-list'
import { FriendSuggestions } from '@/components/friends/friend-suggestions'
import { FriendsNav } from '@/components/layout/friends-nav'
import { FeedStoriesStrip } from '@/components/feed/feed-stories-strip'
import type { FriendSuggestionDTO } from '@/types/api'

interface Group {
  id: string
  name: string
  members: Array<{ 
    id: string
    userId: string
    user?: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
    }
  }>
}

type FriendGroupMap = Record<string, Array<{ id: string; name: string }>>

export default function FriendsPage() {
  const {
    friends,
    requests,
    sentRequests,
    suggestions,
    isLoading,
    error,
    fetchFriends,
    fetchRequests,
    fetchSentRequests,
    fetchSuggestions,
  } = useFriends()

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent' | 'suggestions'>(
    'friends'
  )

  // ✅ Cargar grupos una sola vez por sesión
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)

  // ✅ Mapear grupos por friendId (una sola vez, optimizado con useMemo)
  const groupByFriendId = useMemo<FriendGroupMap>(() => {
    const map: FriendGroupMap = {}

    groups.forEach(group => {
      group.members?.forEach(member => {
        // Obtener el friendId (puede ser userId directo o user.id)
        const friendId = member.userId || member.user?.id
        if (friendId) {
          if (!map[friendId]) {
            map[friendId] = []
          }
          map[friendId].push({
            id: group.id,
            name: group.name,
          })
        }
      })
    })

    return map
  }, [groups])

  // Handler para cambiar de tab - carga datos frescos cuando el usuario hace clic
  const handleTabChange = async (tab: 'friends' | 'requests' | 'sent' | 'suggestions') => {
    setActiveTab(tab)
    
    // Cargar datos específicos del tab cuando el usuario hace clic
    switch (tab) {
      case 'friends':
        await fetchFriends()
        break
      case 'requests':
        await fetchRequests()
        break
      case 'sent':
        await fetchSentRequests()
        break
      case 'suggestions':
        await fetchSuggestions()
        break
    }
  }

  // ✅ Cargar grupos una sola vez al montar
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setIsLoadingGroups(true)
        const response = await apiClient.get<Group[]>(API_ENDPOINTS.GROUPS.LIST)
        if (response.success && response.data) {
          setGroups(Array.isArray(response.data) ? response.data : [])
        }
      } catch (error) {
        console.error('Error al cargar grupos:', error)
      } finally {
        setIsLoadingGroups(false)
      }
    }

    loadGroups()
  }, []) // Solo una vez al montar

  // Cargar datos iniciales solo cuando se monta el componente
  useEffect(() => {
    // Cargar el tab activo al montar (para recargar la página)
    const loadInitialData = async () => {
      await fetchFriends() // Tab inicial
      await fetchRequests() // Para el badge de notificaciones
    }
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo una vez al montar

  const [searchQuery, setSearchQuery] = useState('')
  /** Resultados del API /friends/search (null = aún no hay respuesta o no aplica) */
  const [friendSearchResults, setFriendSearchResults] = useState<FriendSuggestionDTO[] | null>(null)
  const [isFriendSearchLoading, setIsFriendSearchLoading] = useState(false)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const filteredFriendsMemo = useMemo(() => {
    if (!searchQuery.trim()) return friends
    const queryLower = searchQuery.toLowerCase()
    return friends.filter((friend) => {
      const fullName = `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`.trim().toLowerCase()
      const username = (friend.friend.username || '').toLowerCase()
      return fullName.includes(queryLower) || username.includes(queryLower)
    })
  }, [friends, searchQuery])

  const suggestionsFilteredLocally = useMemo(() => {
    if (!searchQuery.trim()) return suggestions
    const queryLower = searchQuery.toLowerCase()
    return suggestions.filter((suggestion) => {
      const fullName = `${suggestion.user.firstName || ''} ${suggestion.user.lastName || ''}`.trim().toLowerCase()
      const username = (suggestion.user.username || '').toLowerCase()
      return fullName.includes(queryLower) || username.includes(queryLower)
    })
  }, [suggestions, searchQuery])

  const searchTrim = searchQuery.trim()
  const useFriendServerSearch = activeTab === 'suggestions' && searchTrim.length >= 2

  const suggestionsForTab = useMemo(() => {
    if (useFriendServerSearch && friendSearchResults !== null) {
      return friendSearchResults
    }
    return suggestionsFilteredLocally
  }, [useFriendServerSearch, friendSearchResults, suggestionsFilteredLocally])

  const suggestionsTabLoading =
    activeTab === 'suggestions' &&
    (isLoading || (useFriendServerSearch && friendSearchResults === null && isFriendSearchLoading))

  const suggestionsEmptyMessage =
    useFriendServerSearch && friendSearchResults !== null && friendSearchResults.length === 0 && !isFriendSearchLoading
      ? 'No se encontró ningún usuario con ese nombre o usuario. Prueba con otras letras.'
      : undefined

  useEffect(() => {
    if (activeTab !== 'suggestions') {
      setFriendSearchResults(null)
      return
    }
    if (searchTrim.length < 2) {
      setFriendSearchResults(null)
      return
    }

    let cancelled = false
    const t = window.setTimeout(async () => {
      setIsFriendSearchLoading(true)
      try {
        const url = `${API_ENDPOINTS.FRIENDS.SEARCH}?q=${encodeURIComponent(searchTrim)}`
        const response = await apiClient.get<FriendSuggestionDTO[]>(url)
        if (cancelled) return
        if (response.success && Array.isArray(response.data)) {
          setFriendSearchResults(response.data)
        } else {
          setFriendSearchResults([])
        }
      } catch {
        if (!cancelled) setFriendSearchResults([])
      } finally {
        if (!cancelled) setIsFriendSearchLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [searchTrim, activeTab])

  const feedInit = useFeedInit()
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  const [feedExplorarActivated, setFeedExplorarActivated] = useState(false)

  const friendsScrollRootRef = useRef<HTMLDivElement | null>(null)
  const [friendsScrollAttached, setFriendsScrollAttached] = useState(false)
  const setFriendsScrollRef = useCallback((node: HTMLDivElement | null) => {
    friendsScrollRootRef.current = node
    setFriendsScrollAttached(!!node)
  }, [])

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const feedNavScroll = useFeedScrollNav(
    friendsScrollRootRef,
    friendsScrollAttached,
    false
  )

  const contentPaddingTop = (() => {
    const w = viewportWidth
    const { minimalMode, compactMid } = feedNavScroll
    const safeOnly = 'max(10px, env(safe-area-inset-top))'

    if (w < 768) {
      return safeOnly
    }

    if (minimalMode) {
      return w < 1024 ? '132px' : '140px'
    }
    if (compactMid) {
      return w < 1024 ? '212px' : '224px'
    }
    return w < 1024 ? '300px' : '312px'
  })()

  const scrollAreaPaddingTop = useMemo(() => {
    if (viewportWidth < 768) {
      return 'max(6.25rem, calc(env(safe-area-inset-top, 0px) + 5.25rem))'
    }
    return contentPaddingTop
  }, [viewportWidth, contentPaddingTop])

  return (
    <div
      className="relative z-0 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
    >
      <div className="pointer-events-none relative z-40 h-0 shrink-0 overflow-visible">
        <div className="pointer-events-auto fixed inset-x-0 top-0 z-40 flex shrink-0 flex-col overflow-visible border-b border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.35)] max-md:bg-[rgba(25,30,35,0.62)] max-md:backdrop-blur-xl max-md:backdrop-saturate-150 md:inset-x-auto md:left-36 md:right-0 md:bg-[var(--color-surface-191e23-20)] md:backdrop-blur-none md:backdrop-saturate-100 md:[-webkit-backdrop-filter:none] lg:left-[208px]">
          <FriendsNav
            onSearch={handleSearch}
            initialSearchQuery={searchQuery}
            feedNavScroll={feedNavScroll}
            stories={feedInit.stories}
            feedExplorarActivated={feedExplorarActivated}
            onFeedExplorarActivated={() => setFeedExplorarActivated(true)}
          />
        </div>
      </div>

      <div
        ref={setFriendsScrollRef}
        id="friends-scroll-root"
        className={clsx(
          'custom-scrollbar relative z-0 min-h-0 w-full flex-1 basis-0 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain px-2 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] pt-2 [-webkit-overflow-scrolling:touch] transition-[padding-top] duration-300 ease-out sm:px-3 sm:pt-4 md:px-4 md:py-5 md:pb-5',
        )}
        style={{
          paddingTop: scrollAreaPaddingTop,
          marginRight: '0',
          scrollBehavior: 'smooth',
          scrollPaddingTop: 'max(env(safe-area-inset-top),12px)',
          scrollPaddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <FeedStoriesStrip
          className="sticky top-0 z-[60] -mx-2 mb-3 px-2 backdrop-blur-md md:hidden"
          style={{
            backgroundColor: 'rgba(25, 30, 35, 0.42)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
          showStoriesStrip={feedNavScroll.showStoriesStrip}
          stories={feedInit.stories}
          feedExplorarActivated
          onExplorarActivated={() => setFeedExplorarActivated(true)}
        />

        <div className="mx-auto max-w-6xl px-2 pb-4 sm:px-3 md:px-4">
          <FriendsTabs activeTab={activeTab} onTabChange={handleTabChange} requestsCount={requests.length} />

          <div className="mt-6">
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {activeTab === 'friends' && (
              <FriendsList
                friends={searchQuery.trim() ? filteredFriendsMemo : friends}
                isLoading={isLoading}
                onRefresh={fetchFriends}
                groupByFriendId={groupByFriendId}
              />
            )}

            {activeTab === 'requests' && (
              <FriendRequestList
                requests={requests}
                isLoading={isLoading}
                onAccept={async (id) => {
                  await fetchRequests()
                  await fetchFriends()
                }}
                onReject={async (id) => {
                  await fetchRequests()
                }}
              />
            )}

            {activeTab === 'sent' && (
              <SentRequestsList
                requests={sentRequests}
                isLoading={isLoading}
                onCancel={async (id) => {
                  await fetchSentRequests()
                }}
              />
            )}

            {activeTab === 'suggestions' && (
              <FriendSuggestions
                suggestions={suggestionsForTab}
                isLoading={suggestionsTabLoading}
                emptyMessage={suggestionsEmptyMessage}
                onSendRequest={async (friendId) => {
                  setFriendSearchResults((prev) => (prev ? prev.filter((s) => s.userId !== friendId) : prev))
                  await fetchSuggestions()
                  await fetchSentRequests()
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

