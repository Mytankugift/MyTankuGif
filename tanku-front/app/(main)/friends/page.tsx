/**
 * Página de Amigos
 * Gestiona solicitudes, lista de amigos y sugerencias
 */

'use client'

import { useState, useEffect } from 'react'
import { useFriends } from '@/lib/hooks/use-friends'
import { FriendsTabs } from '@/components/friends/friends-tabs'
import { FriendsList } from '@/components/friends/friends-list'
import { FriendRequestList } from '@/components/friends/friend-request-list'
import { SentRequestsList } from '@/components/friends/sent-requests-list'
import { FriendSuggestions } from '@/components/friends/friend-suggestions'
import { BlockedUsersList } from '@/components/friends/blocked-users-list'
import { FriendsNav } from '@/components/layout/friends-nav'

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

  // Cargar datos iniciales solo cuando se monta el componente
  useEffect(() => {
    // Cargar el tab activo al montar (para recargar la página)
    const loadInitialData = async () => {
      await fetchFriends() // Tab inicial
      await fetchRequests() // Para el badge de notificaciones
    }
    loadInitialData()
  }, []) // Solo una vez al montar

  const [searchQuery, setSearchQuery] = useState('')
  const [filteredFriends, setFilteredFriends] = useState<typeof friends>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<typeof suggestions>([])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    if (activeTab === 'friends') {
      // Buscar en amigos
      if (!query.trim()) {
        setFilteredFriends(friends)
      } else {
        const filtered = friends.filter((friend) => {
          const fullName = `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`.trim().toLowerCase()
          return fullName.includes(query.toLowerCase())
        })
        setFilteredFriends(filtered)
      }
    } else if (activeTab === 'suggestions') {
      // Buscar en sugerencias (cualquier persona)
      if (!query.trim()) {
        setFilteredSuggestions(suggestions)
      } else {
        const filtered = suggestions.filter((suggestion) => {
          const fullName = `${suggestion.user.firstName || ''} ${suggestion.user.lastName || ''}`.trim().toLowerCase()
          return fullName.includes(query.toLowerCase())
        })
        setFilteredSuggestions(filtered)
      }
    }
  }

  // Actualizar filtros cuando cambian los datos o el tab
  useEffect(() => {
    if (activeTab === 'friends') {
      if (!searchQuery.trim()) {
        setFilteredFriends(friends)
      } else {
        const filtered = friends.filter((friend) => {
          const fullName = `${friend.friend.firstName || ''} ${friend.friend.lastName || ''}`.trim().toLowerCase()
          return fullName.includes(searchQuery.toLowerCase())
        })
        setFilteredFriends(filtered)
      }
    } else if (activeTab === 'suggestions') {
      if (!searchQuery.trim()) {
        setFilteredSuggestions(suggestions)
      } else {
        const filtered = suggestions.filter((suggestion) => {
          const fullName = `${suggestion.user.firstName || ''} ${suggestion.user.lastName || ''}`.trim().toLowerCase()
          return fullName.includes(searchQuery.toLowerCase())
        })
        setFilteredSuggestions(filtered)
      }
    }
  }, [friends, suggestions, activeTab, searchQuery])

  return (
    <>
      <FriendsNav onSearch={handleSearch} initialSearchQuery={searchQuery} />
      <div className="min-h-screen p-4 sm:p-6 md:p-8 pt-20 sm:pt-24 md:pt-28" style={{ backgroundColor: '#1E1E1E' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 mt-2">
            <h1 className="text-3xl font-bold text-[#66DEDB] mb-2">Amigos</h1>
            <p className="text-gray-400">Gestiona tus conexiones y descubre nuevas personas</p>
          </div>

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
            <FriendsList friends={searchQuery ? filteredFriends : friends} isLoading={isLoading} onRefresh={fetchFriends} />
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
              suggestions={searchQuery ? filteredSuggestions : suggestions}
              isLoading={isLoading}
              onSendRequest={async (friendId) => {
                await fetchSuggestions()
                await fetchSentRequests()
              }}
            />
          )}

          {activeTab === 'blocked' && (
            <BlockedUsersList
              blockedUsers={blockedUsers}
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

