/**
 * Lista de solicitudes recibidas
 */

'use client'

import { FriendRequestCard } from './friend-request-card'
import type { FriendRequestDTO } from '@/types/api'

interface FriendRequestListProps {
  requests: FriendRequestDTO[]
  isLoading: boolean
  onAccept: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
}

export function FriendRequestList({
  requests,
  isLoading,
  onAccept,
  onReject,
}: FriendRequestListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Cargando solicitudes...</div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No tienes solicitudes pendientes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <FriendRequestCard
          key={request.id}
          request={request}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </div>
  )
}

