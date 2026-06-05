/**
 * Lista de amigos — cuadrícula 2/3/4 cols según contenedor (ver .friends-cards-grid) o lista
 */

'use client'

import { FriendCard } from './friend-card'

import type { FriendDTO } from '@/types/api'

export const FRIENDS_LOAD_STEP = 12

export type FriendsViewMode = 'grid' | 'list'

type FriendGroupMap = Record<string, Array<{ id: string; name: string }>>

interface FriendsListProps {
  friends: FriendDTO[]
  isLoading: boolean
  onRefresh: () => void
  groupByFriendId: FriendGroupMap
  visibleCount: number
  onLoadMore: () => void
  viewMode?: FriendsViewMode
}

export function FriendsList({
  friends,
  isLoading,
  onRefresh,
  groupByFriendId,
  visibleCount,
  onLoadMore,
  viewMode = 'grid',
}: FriendsListProps) {
  const layout = viewMode === 'list' ? 'list' : 'grid'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-zinc-500">Cargando amigos…</div>
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-zinc-400">Aún no tienes amigos</p>
        <p className="mt-1 text-sm text-zinc-600">Explora las sugerencias para conectar.</p>
      </div>
    )
  }

  const chunk = friends.slice(0, visibleCount)

  const hasMore = visibleCount < friends.length

  return (
    <div className="space-y-5">
      {layout === 'list' ? (
        <div className="flex flex-col gap-3">
          {chunk.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              onRefresh={onRefresh}
              groups={groupByFriendId[friend.friendId] || []}
              layout={layout}
            />
          ))}
        </div>
      ) : (
        <div className="friends-cards-container">
          <div className="friends-cards-grid">
            {chunk.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onRefresh={onRefresh}
                groups={groupByFriendId[friend.friendId] || []}
                layout={layout}
              />
            ))}
          </div>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => onLoadMore()}
            className="rounded-full border border-[#66DEDB]/30 px-5 py-2 text-sm font-medium text-[#66DEDB] transition-colors hover:border-[#73FFA2]/40 hover:text-[#73FFA2]"
          >
            Ver más amigos ({friends.length - visibleCount})
          </button>
        </div>
      )}
    </div>
  )
}

export const FRIENDS_PAGE_INITIAL = FRIENDS_LOAD_STEP
