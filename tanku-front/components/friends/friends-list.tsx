/**
 * Lista de amigos
 */

'use client'

import { FriendCard } from './friend-card'
import type { FriendDTO } from '@/types/api'

type FriendGroupMap = Record<string, Array<{ id: string; name: string }>>

interface FriendsListProps {
  friends: FriendDTO[]
  isLoading: boolean
  onRefresh: () => void
  groupByFriendId: FriendGroupMap
}

export function FriendsList({ friends, isLoading, onRefresh, groupByFriendId }: FriendsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Cargando amigos...</div>
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Aún no tienes amigos</p>
        <p className="text-sm text-gray-500">Explora las sugerencias para encontrar personas</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {friends.map((friend) => (
        <FriendCard 
          key={friend.id} 
          friend={friend} 
          onRefresh={onRefresh}
          groups={groupByFriendId[friend.friendId] || []}
        />
      ))}
    </div>
  )
}

