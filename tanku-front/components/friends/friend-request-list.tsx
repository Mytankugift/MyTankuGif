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
  /** Tarjetas estrechas (columna lateral) */
  compact?: boolean
}

export function FriendRequestList({
  requests,
  isLoading,
  onAccept,
  onReject,
  compact = false,
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
      <div className={compact ? 'rounded-lg border border-dashed border-white/10 py-6 text-center' : 'py-12 text-center'}>
        <p className="text-xs text-zinc-500 sm:text-sm">No hay solicitudes pendientes</p>
      </div>
    )
  }

  return (
    <div
      className={
        compact
          ? 'flex flex-col gap-2 pt-0.5'
          : 'space-y-3 sm:space-y-4'
      }
    >
      {requests.map((request) => (
        <FriendRequestCard
          key={request.id}
          request={request}
          onAccept={onAccept}
          onReject={onReject}
          compact={compact}
        />
      ))}
    </div>
  )
}

