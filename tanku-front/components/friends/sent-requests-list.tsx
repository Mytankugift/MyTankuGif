/**
 * Lista de solicitudes enviadas
 */

'use client'

import { SentRequestCard } from './sent-request-card'
import type { FriendRequestDTO } from '@/types/api'

interface SentRequestsListProps {
  requests: FriendRequestDTO[]
  isLoading: boolean
  onCancel: (id: string) => Promise<void>
}

export function SentRequestsList({
  requests,
  isLoading,
  onCancel,
}: SentRequestsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Cargando solicitudes enviadas...</div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No has enviado solicitudes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <SentRequestCard key={request.id} request={request} onCancel={onCancel} />
      ))}
    </div>
  )
}

