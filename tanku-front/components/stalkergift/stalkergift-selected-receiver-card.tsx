'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { User } from '@/types/api'

function fallbackAvatar(label: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label.trim() || 'U')}&background=1E1E1E&color=FE9600&size=128&bold=true`
}

export function StalkerGiftSelectedReceiverCard({
  user,
  onRemove,
}: {
  user: User
  onRemove?: () => void
}) {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  const handle = user.username?.trim()
  const label = handle ? `@${handle}` : fullName || user.email || 'Usuario'

  const preferredSrc = useMemo(
    () => user.profile?.avatar?.trim() || fallbackAvatar(label),
    [user.id, user.profile?.avatar, label],
  )

  const [src, setSrc] = useState(preferredSrc)

  useEffect(() => {
    setSrc(preferredSrc)
  }, [preferredSrc, user.id])

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#FE9600]/35 bg-gradient-to-r from-[#FE9600]/12 to-black/20 px-4 py-3 ring-1 ring-white/5">
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#FE9600]/50 bg-zinc-900 shadow-md">
        <Image
          key={user.id}
          src={src}
          alt=""
          width={56}
          height={56}
          className="h-full w-full object-cover"
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => {
            const fb = fallbackAvatar(label)
            if (src !== fb) setSrc(fb)
          }}
        />
      </span>
      <div className="min-w-0 flex-1 text-left">
        {handle ? (
          <p className="truncate text-base font-semibold text-[#FE9600]">@{handle}</p>
        ) : (
          <p className="truncate text-base font-semibold text-white">{user.email}</p>
        )}
        {fullName ? (
          <p className="mt-0.5 truncate text-sm text-zinc-300">{fullName}</p>
        ) : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Quitar selección"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  )
}
