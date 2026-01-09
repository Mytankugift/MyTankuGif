/**
 * Tarjeta individual de usuario bloqueado
 */

'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useFriends } from '@/lib/hooks/use-friends'

interface BlockedUserDTO {
  id: string
  userId: string
  blockedUserId: string
  blockedUser: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    profile?: {
      avatar: string | null
    } | null
  }
  createdAt: string
}

interface BlockedUserCardProps {
  blockedUser: BlockedUserDTO
  onRefresh: () => void
}

export function BlockedUserCard({ blockedUser, onRefresh }: BlockedUserCardProps) {
  const { unblockUser } = useFriends()
  const [isUnblocking, setIsUnblocking] = useState(false)

  const handleUnblock = async () => {
    if (!confirm(`¿Estás seguro de que quieres desbloquear a ${blockedUser.blockedUser.firstName || 'este usuario'}?`)) {
      return
    }

    setIsUnblocking(true)
    try {
      await unblockUser(blockedUser.blockedUserId)
      onRefresh()
    } catch (error) {
      console.error('Error desbloqueando usuario:', error)
    } finally {
      setIsUnblocking(false)
    }
  }

  const fullName = `${blockedUser.blockedUser.firstName || ''} ${blockedUser.blockedUser.lastName || ''}`.trim() || 'Sin nombre'
  const initialAvatar = blockedUser.blockedUser.profile?.avatar || ''
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'U')}&background=1E1E1E&color=73FFA2&size=64&bold=true`
  const [imgSrc, setImgSrc] = useState<string>(initialAvatar || fallbackAvatar)

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-red-500/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={imgSrc}
            alt={fullName}
            width={64}
            height={64}
            className="object-cover"
            onError={() => setImgSrc(fallbackAvatar)}
            referrerPolicy="no-referrer"
            unoptimized
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{fullName}</h3>
          <p className="text-gray-400 text-sm truncate">{blockedUser.blockedUser.email}</p>
          <p className="text-gray-500 text-xs mt-1">Bloqueado</p>
        </div>

        {/* Acciones */}
        <div className="flex-shrink-0">
          <button
            onClick={handleUnblock}
            disabled={isUnblocking}
            className="px-3 py-1.5 text-xs text-[#73FFA2] hover:text-[#66DEDB] hover:bg-[#73FFA2]/10 rounded transition-colors disabled:opacity-50"
          >
            {isUnblocking ? 'Desbloqueando...' : 'Desbloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}

