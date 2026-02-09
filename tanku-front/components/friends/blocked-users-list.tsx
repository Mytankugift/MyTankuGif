/**
 * Lista de usuarios bloqueados
 */

'use client'

import { BlockedUserCard } from './blocked-user-card'

interface BlockedUserDTO {
  id: string
  userId: string
  blockedUserId: string
  blockedUser: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    username: string | null
    profile?: {
      avatar: string | null
    } | null
  }
  createdAt: string
}

interface BlockedUsersListProps {
  blockedUsers: BlockedUserDTO[]
  isLoading: boolean
  onRefresh: () => void
}

export function BlockedUsersList({ blockedUsers, isLoading, onRefresh }: BlockedUsersListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Cargando usuarios bloqueados...</div>
      </div>
    )
  }

  const safeBlockedUsers = blockedUsers || []

  if (safeBlockedUsers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">No has bloqueado a ningún usuario</p>
        <p className="text-sm text-gray-500">Los usuarios bloqueados aparecerán aquí</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {safeBlockedUsers.map((blockedUser) => (
        <BlockedUserCard key={blockedUser.id} blockedUser={blockedUser} onRefresh={onRefresh} />
      ))}
    </div>
  )
}

