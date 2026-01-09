/**
 * Tarjeta de solicitud enviada
 */

'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useFriends } from '@/lib/hooks/use-friends'
import type { FriendRequestDTO } from '@/types/api'

interface SentRequestCardProps {
  request: FriendRequestDTO
  onCancel: (id: string) => Promise<void>
}

export function SentRequestCard({ request, onCancel }: SentRequestCardProps) {
  const { cancelSentRequest } = useFriends()
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await cancelSentRequest(request.id)
      await onCancel(request.id)
    } catch (error) {
      console.error('Error cancelando solicitud:', error)
    } finally {
      setIsCancelling(false)
    }
  }

  const fullName = `${request.fromUser.firstName || ''} ${request.fromUser.lastName || ''}`.trim() || 'Sin nombre'
  const avatar = request.fromUser.profile?.avatar || null

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-[#73FFA2]/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center flex-shrink-0">
          {avatar ? (
            <Image
              src={avatar}
              alt={fullName}
              width={64}
              height={64}
              className="object-cover w-full h-full rounded-full"
              unoptimized={avatar.startsWith('http')}
            />
          ) : (
            <span className="text-lg text-gray-400 font-bold">
              {(request.fromUser.firstName?.[0] || request.fromUser.email?.[0] || 'U').toUpperCase()}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{fullName}</h3>
          <p className="text-gray-400 text-sm truncate">{request.fromUser.email}</p>
          <p className="text-gray-500 text-xs mt-1">Solicitud pendiente</p>
        </div>

        {/* Acciones */}
        <div className="flex-shrink-0">
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="px-4 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
          >
            {isCancelling ? 'Cancelando...' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}

