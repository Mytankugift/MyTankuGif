/**
 * Lista de usuarios bloqueados — minimalista + buscador (misma lupa que el feed).
 */

'use client'

import { useMemo, useState } from 'react'
import { BlockedUserCard } from './blocked-user-card'
import { FeedSearchMagnifierIcon } from '@/components/feed/feed-search-magnifier-icon'

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
  /** Ocultar barra de búsqueda (p. ej. vista muy estrecha) */
  hideSearch?: boolean
}

function matchesSearch(blockedUser: BlockedUserDTO, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  const u = blockedUser.blockedUser
  const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase()
  const user = (u.username || '').toLowerCase()
  const mail = (u.email || '').toLowerCase()
  return (
    name.includes(s) ||
    user.includes(s.replace(/^@/, '')) ||
    mail.includes(s)
  )
}

export function BlockedUsersList({
  blockedUsers,
  isLoading,
  onRefresh,
  hideSearch = false,
}: BlockedUsersListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const safe = blockedUsers || []
    return safe.filter((b) => matchesSearch(b, query))
  }, [blockedUsers, query])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="text-sm text-white/40">Cargando…</div>
      </div>
    )
  }

  const safeBlockedUsers = blockedUsers || []

  if (safeBlockedUsers.length === 0) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-white/50">No has bloqueado a nadie</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {!hideSearch && (
        <div className="relative mb-3 shrink-0">
          <div className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2">
            <FeedSearchMagnifierIcon className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, @usuario o correo…"
            className="tanku-pill-search-input w-full rounded-full border border-white/10 py-2 pl-10 pr-3 text-sm text-white placeholder:text-white/35 transition-all duration-200 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-white/45">Ningún resultado para tu búsqueda</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl bg-white/[0.03] px-2 sm:px-3">
          {filtered.map((blockedUser) => (
            <BlockedUserCard key={blockedUser.id} blockedUser={blockedUser} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  )
}
