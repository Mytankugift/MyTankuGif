'use client'

import { FriendRequestList } from '@/components/friends/friend-request-list'
import type { FriendRequestDTO } from '@/types/api'

interface FriendsRequestsModalProps {
  open: boolean
  onClose: () => void
  requests: FriendRequestDTO[]
  isLoading: boolean
  onAccept: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
}

export function FriendsRequestsModal({
  open,
  onClose,
  requests,
  isLoading,
  onAccept,
  onReject,
}: FriendsRequestsModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#191e23] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Solicitudes de amistad</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-4 custom-scrollbar">
          <FriendRequestList
            requests={requests}
            isLoading={isLoading}
            compact={false}
            onAccept={onAccept}
            onReject={onReject}
          />
        </div>
      </div>
    </div>
  )
}
