'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { BlockedUsersList } from '@/components/friends/blocked-users-list'

type BlockedUserDTO = {
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

type BlockedUsersModalProps = {
  open: boolean
  onClose: () => void
  blockedUsers: BlockedUserDTO[]
  isLoading: boolean
  onRefresh: () => void
}

export function BlockedUsersModal({
  open,
  onClose,
  blockedUsers,
  isLoading,
  onRefresh,
}: BlockedUsersModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[2000005] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[min(560px,85vh)] w-full max-w-lg flex-col overflow-hidden rounded-[25px] border border-[#414141] shadow-2xl"
        style={{ backgroundColor: '#171B21' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#414141] p-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Usuarios bloqueados</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              No pueden ver tu perfil ni interactuar contigo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <BlockedUsersList
            blockedUsers={blockedUsers}
            isLoading={isLoading}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  )
}
