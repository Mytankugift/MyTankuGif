/**
 * Página de Amigos
 * Gestiona solicitudes, lista de amigos y sugerencias
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFriends } from '@/lib/hooks/use-friends'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { FriendsTabs } from '@/components/friends/friends-tabs'
import { FriendsList } from '@/components/friends/friends-list'
import { FriendRequestList } from '@/components/friends/friend-request-list'
import { SentRequestsList } from '@/components/friends/sent-requests-list'
import { FriendSuggestions } from '@/components/friends/friend-suggestions'
import { BlockedUsersList } from '@/components/friends/blocked-users-list'
import { FriendsNav } from '@/components/layout/friends-nav'
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
    blockedUsers,
    isLoading,
    error,
    fetchFriends,
    fetchRequests,
    fetchSentRequests,
    fetchSuggestions,
    fetchBlockedUsers,
  } = useFriends()

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent' | 'suggestions' | 'blocked'>(
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
  const handleTabChange = async (tab: 'friends' | 'requests' | 'sent' | 'suggestions' | 'blocked') => {
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
      case 'blocked':
        await fetchBlockedUsers()
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

  const filteredBlockedMemo = useMemo(() => {
    if (!searchQuery.trim()) return blockedUsers
    const queryLower = searchQuery.toLowerCase()
    return blockedUsers.filter((blockedUser) => {
      const fullName = `${blockedUser.blockedUser.firstName || ''} ${blockedUser.blockedUser.lastName || ''}`.trim().toLowerCase()
      const username = (blockedUser.blockedUser.username || '').toLowerCase()
      return fullName.includes(queryLower) || username.includes(queryLower)
    })
  }, [blockedUsers, searchQuery])

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

  return (
    <>
      <FriendsNav onSearch={handleSearch} initialSearchQuery={searchQuery} />
      <div
        className="min-h-screen overflow-x-hidden overflow-y-auto p-4 pt-52 sm:p-6 sm:pt-56 md:min-h-0 md:h-full md:max-h-full md:overflow-visible md:p-8 md:pt-60 custom-scrollbar"
        style={{
          backgroundColor: '#1E1E1E',
        }}
      >
        <div className="max-w-6xl mx-auto">
        {/* Tabs */}
        <FriendsTabs activeTab={activeTab} onTabChange={handleTabChange} requestsCount={requests.length} />

        {/* Contenido según tab activo */}
        <div className="mt-6">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
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

          {activeTab === 'blocked' && (
            <BlockedUsersList
              blockedUsers={searchQuery.trim() ? filteredBlockedMemo : blockedUsers}
              isLoading={isLoading}
              onRefresh={async () => {
                await fetchBlockedUsers()
              }}
            />
          )}
        </div>
        </div>
      </div>
    </>
  )
}

