'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useFriends } from '@/lib/hooks/use-friends'
import { FriendsPageSearchBar } from '@/components/friends/friends-page-search-bar'
import {
  ReceiverTankuSearchDropdown,
  type ReceiverTankuSearchRow,
} from '@/components/stalkergift/receiver-tanku-search-dropdown'
import { StalkerGiftFriendQuickBubbles } from '@/components/stalkergift/stalkergift-friend-quick-bubbles'
import { StalkerGiftSelectedReceiverCard } from '@/components/stalkergift/stalkergift-selected-receiver-card'
import { isConfirmedMinorFromBirthIso } from '@/lib/utils/user-age'
import type { User, FriendUserDTO, FriendSuggestionDTO } from '@/types/api'

/** Receptor del flujo StalkerGift (solo usuario Tanku). */
export interface ReceiverData {
  type: 'tanku'
  user: User
}

interface ReceiverSelectorProps {
  receiver: ReceiverData | null
  /** `null` quita la selección para poder buscar otro usuario. */
  onSelect: (receiver: ReceiverData | null) => void
}

function matchesNameOrUsername(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  username: string | null | undefined,
  qLower: string,
): boolean {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim().toLowerCase()
  const u = (username || '').toLowerCase()
  return fullName.includes(qLower) || u.includes(qLower)
}

export function ReceiverSelector({ receiver, onSelect }: ReceiverSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [friendSearchResults, setFriendSearchResults] = useState<FriendSuggestionDTO[] | null>(null)
  const [isFriendSearchLoading, setIsFriendSearchLoading] = useState(false)
  const [navSearchFocused, setNavSearchFocused] = useState(false)

  const { friends, fetchFriends } = useFriends()

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  const searchTrim = searchQuery.trim()
  const searchDropdownLoading = searchTrim.length >= 2 && isFriendSearchLoading

  const tankuSearchRows = useMemo((): ReceiverTankuSearchRow[] => {
    const qLower = searchTrim.toLowerCase()
    if (!qLower) return []

    const seen = new Set<string>()
    const fromFriends: ReceiverTankuSearchRow[] = []

    for (const f of friends) {
      if (!matchesNameOrUsername(f.friend.firstName, f.friend.lastName, f.friend.username, qLower)) {
        continue
      }
      const uid = f.friend.id
      seen.add(uid)
      const fullName =
        `${f.friend.firstName || ''} ${f.friend.lastName || ''}`.trim() || 'Sin nombre'
      const un = f.friend.username?.trim()
      fromFriends.push({
        key: `friend-${f.id}`,
        user: f.friend,
        title: un ? `@${un}` : fullName,
        subtitle: 'En tu lista de amigos',
      })
    }
    fromFriends.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }))

    const fromApi: ReceiverTankuSearchRow[] = []
    if (searchTrim.length >= 2 && Array.isArray(friendSearchResults)) {
      const sortedRemote = [...friendSearchResults].sort(
        (a, b) => (b.mutualFriendsCount ?? 0) - (a.mutualFriendsCount ?? 0),
      )
      for (const s of sortedRemote) {
        if (seen.has(s.userId)) continue
        seen.add(s.userId)
        const fullName =
          `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() || 'Sin nombre'
        const un = s.user.username?.trim()
        const mutual = s.mutualFriendsCount ?? 0
        fromApi.push({
          key: `remote-${s.userId}`,
          user: s.user,
          title: un ? `@${un}` : fullName,
          subtitle:
            mutual > 0
              ? `${mutual} contacto${mutual === 1 ? '' : 's'} en común`
              : undefined,
        })
      }
    }

    return [...fromFriends, ...fromApi].filter(
      (row) => !isConfirmedMinorFromBirthIso(row.user.birthDate ?? null),
    )
  }, [friends, friendSearchResults, searchTrim])

  useEffect(() => {
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
  }, [searchTrim])

  const showNavSearchDropdown = navSearchFocused && searchTrim.length > 0

  const handleSelectTankuUser = (user: FriendUserDTO) => {
    if (isConfirmedMinorFromBirthIso(user.birthDate ?? null)) return
    const rawPhone = (user as FriendUserDTO & { phone?: unknown }).phone
    const phone: string | null = typeof rawPhone === 'string' ? rawPhone : null
    const fullUser: User = {
      ...user,
      phone,
      birthDate: user.birthDate ?? null,
    }
    onSelect({
      type: 'tanku',
      user: fullUser,
    })
    setSearchQuery('')
    setNavSearchFocused(false)
  }

  const selectedTankuId = receiver?.user?.id ?? null

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div className="text-center">
        <p className="mb-2 text-base text-[#66DEDB]">
          Escoge ahora la persona con la que deseas conectar.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative w-full min-w-0">
          <FriendsPageSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchFocus={() => setNavSearchFocused(true)}
            onSearchBlur={() => setNavSearchFocused(false)}
            searchDropdownSlot={
              showNavSearchDropdown ? (
                <ReceiverTankuSearchDropdown
                  hits={tankuSearchRows}
                  loading={searchDropdownLoading}
                  onSelect={handleSelectTankuUser}
                  selectedUserId={selectedTankuId}
                />
              ) : null
            }
          />
        </div>

        {receiver?.user ? (
          <>
            <StalkerGiftSelectedReceiverCard
              user={receiver.user}
              onRemove={() => {
                onSelect(null)
              }}
            />
            <p className="text-center text-xs text-zinc-500">
              ¿Otra persona? Escribe arriba para sustituirla, o quítala con el botón a la derecha.
            </p>
          </>
        ) : (
          <p className="text-center text-xs text-zinc-500">
            Con 2 o más caracteres también buscamos en toda Tanku.
          </p>
        )}

        <StalkerGiftFriendQuickBubbles
          friends={friends}
          excludedUserId={selectedTankuId}
          priorityCap={8}
          onPick={handleSelectTankuUser}
        />
      </div>
    </div>
  )
}
