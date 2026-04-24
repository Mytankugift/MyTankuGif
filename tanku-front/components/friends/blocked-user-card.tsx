/**
 * Fila compacta para usuario bloqueado (lista minimalista).
 */

'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useFriends } from '@/lib/hooks/use-friends'
import { UnblockConfirmModal } from '@/components/friends/unblock-confirm-modal'

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

interface BlockedUserCardProps {
  blockedUser: BlockedUserDTO
  onRefresh: () => void
}

export function BlockedUserCard({ blockedUser, onRefresh }: BlockedUserCardProps) {
  const { unblockUser } = useFriends()
  const [isUnblocking, setIsUnblocking] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const confirmLabel =
    blockedUser.blockedUser.username?.trim() ||
    `${blockedUser.blockedUser.firstName || ''} ${blockedUser.blockedUser.lastName || ''}`.trim() ||
    blockedUser.blockedUser.email ||
    'este usuario'

  const runUnblock = async () => {
    setIsUnblocking(true)
    try {
      await unblockUser(blockedUser.blockedUserId)
      setConfirmOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Error desbloqueando usuario:', error)
    } finally {
      setIsUnblocking(false)
    }
  }

  const u = blockedUser.blockedUser
  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim()
  const username = u.username?.trim()

  let primary: string
  let subtitle: string | null
  if (fullName) {
    primary = fullName
    subtitle = username ? `@${username}` : u.email
  } else if (username) {
    primary = `@${username}`
    subtitle = u.email
  } else {
    primary = u.email
    subtitle = null
  }

  const initialAvatar = u.profile?.avatar || ''
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(primary)}&background=262626&color=73FFA2&size=128&bold=true`
  const [imgSrc, setImgSrc] = useState<string>(initialAvatar || fallbackAvatar)

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.07]">
        <Image
          src={imgSrc}
          alt=""
          width={40}
          height={40}
          className="h-full w-full object-cover"
          onError={() => setImgSrc(fallbackAvatar)}
          referrerPolicy="no-referrer"
          unoptimized
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white/95">{primary}</p>
        {subtitle ? (
          <p className="truncate text-xs text-white/45">{subtitle}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isUnblocking}
        className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-[#73FFA2]/90 transition-colors hover:bg-[#73FFA2]/10 hover:text-[#73FFA2] disabled:opacity-40"
      >
        Desbloquear
      </button>

      <UnblockConfirmModal
        open={confirmOpen}
        displayName={confirmLabel}
        isLoading={isUnblocking}
        onCancel={() => !isUnblocking && setConfirmOpen(false)}
        onConfirm={runUnblock}
      />
    </div>
  )
}
