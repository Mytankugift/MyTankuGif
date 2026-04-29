/**
 * Franja debajo del nav → `/wishlist?tab=saved` (lista de guardadas sin pestañas en la página).
 * Móvil (&lt; md): solo avatar del dueño de la wishlist guardada más reciente.
 * Escritorio (md+): hasta 2 dueños distintos.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { StarIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

type ShortcutTab = 'liked' | 'mine' | 'saved'

interface SavedWishlistPayload {
  id: string
  userId?: string
  user?: {
    id: string
    firstName?: string | null
    lastName?: string | null
    profile?: { avatar?: string | null } | null
  }
  owner?: { id: string; firstName?: string | null; lastName?: string | null; profile?: { avatar?: string | null } | null }
}

function shortOwnerName(first?: string | null, last?: string | null): string {
  const firstWord = first?.trim()?.split(/\s+/)[0] ?? ''
  const lastInitial = last?.trim()?.[0]
  if (firstWord && lastInitial) return `${firstWord} ${lastInitial}.`
  if (firstWord) return firstWord
  return 'Usuario'
}

function normalizeUser(
  w: SavedWishlistPayload,
): { id: string; firstName: string | null; lastName: string | null; profile?: { avatar?: string | null } | null } | null {
  const user = (w.user ?? w.owner) as SavedWishlistPayload['user']
  const id = user?.id ?? w.userId
  if (!id || !user) return null
  return {
    id,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    profile: user.profile ?? null,
  }
}

/** Primer elemento del API = wishlist guardada más reciente (backend: SavedWishlist.createdAt desc). */
function lastSavedOwner(rows: SavedWishlistPayload[]): ReturnType<typeof normalizeUser> {
  const first = rows[0]
  if (!first) return null
  return normalizeUser(first)
}

/** Hasta 2 dueños distintos (escritorio / tablet). */
function uniqueOwners(
  rows: SavedWishlistPayload[],
): Array<NonNullable<ReturnType<typeof normalizeUser>>> {
  const seen = new Set<string>()
  const out: Array<NonNullable<ReturnType<typeof normalizeUser>>> = []
  for (const w of rows) {
    const u = normalizeUser(w)
    if (!u || seen.has(u.id)) continue
    seen.add(u.id)
    out.push(u)
    if (out.length >= 2) break
  }
  return out
}

export interface WishlistSavedShortcutProps {
  /** Ocultar si ya estás en la pestaña Wishlists guardadas */
  hideWhenOnSavedTab?: boolean
  activeTab?: ShortcutTab
}

export function WishlistSavedShortcut({
  hideWhenOnSavedTab = true,
  activeTab,
}: WishlistSavedShortcutProps) {
  const { isAuthenticated } = useAuthStore()
  const [lastOwner, setLastOwner] = useState<ReturnType<typeof normalizeUser>>(null)
  const [desktopOwners, setDesktopOwners] = useState<
    Array<NonNullable<ReturnType<typeof normalizeUser>>>
  >([])
  const [loaded, setLoaded] = useState(false)

  const fetchSavedPreview = useCallback(async () => {
    if (!isAuthenticated) {
      setLastOwner(null)
      setDesktopOwners([])
      setLoaded(true)
      return
    }
    try {
      const response = await apiClient.get<SavedWishlistPayload[]>(API_ENDPOINTS.WISHLISTS.SAVED)
      if (!response.success || !response.data?.length) {
        setLastOwner(null)
        setDesktopOwners([])
        setLoaded(true)
        return
      }
      const transformed = response.data.map((w: SavedWishlistPayload) => ({
        ...w,
        userId: w.userId ?? w.owner?.id ?? w.user?.id,
        /** Si no hay `user` ni `owner`, sintético; aquí ambos son nullish → id solo desde `userId`. */
        user: w.user ??
          w.owner ?? {
            id: w.userId ?? '',
            firstName: null,
            lastName: null,
            profile: null,
          },
      }))
      setLastOwner(lastSavedOwner(transformed))
      setDesktopOwners(uniqueOwners(transformed))
    } catch {
      setLastOwner(null)
      setDesktopOwners([])
    } finally {
      setLoaded(true)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchSavedPreview()
  }, [fetchSavedPreview])

  useEffect(() => {
    if (!isAuthenticated) return
    const refresh = () => {
      window.setTimeout(() => fetchSavedPreview(), 300)
    }
    window.addEventListener('wishlist-saved', refresh)
    window.addEventListener('wishlist-access-approved', refresh)
    return () => {
      window.removeEventListener('wishlist-saved', refresh)
      window.removeEventListener('wishlist-access-approved', refresh)
    }
  }, [isAuthenticated, fetchSavedPreview])

  const hidden = useMemo(
    () => hideWhenOnSavedTab && activeTab === 'saved',
    [hideWhenOnSavedTab, activeTab],
  )

  if (hidden) return null

  return (
    <div className="mb-4 md:mb-5">
      <Link
        href="/wishlist?tab=saved"
        className={[
          'group flex min-h-[4.75rem] w-full items-center gap-2 rounded-2xl border border-[#66DEDB]/35',
          'bg-[#171B21]/90 px-3 py-3 shadow-sm transition-colors sm:gap-3 sm:px-5 sm:py-4',
          'hover:border-[#66DEDB]/60 hover:bg-[#1c2128]',
        ].join(' ')}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#66DEDB]/50 bg-black/20 sm:h-12 sm:w-12"
            aria-hidden
          >
            <StarIcon className="h-5 w-5 text-[#66DEDB] sm:h-6 sm:w-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="break-words text-[15px] font-bold leading-tight text-[#66DEDB] sm:text-base">
              Wishlists guardadas
            </p>
            <p className="mt-0.5 break-words text-[11px] leading-snug text-zinc-400 sm:text-xs">
              {!isAuthenticated
                ? 'Inicia sesión para ver tus wishlists guardadas'
                : !loaded
                  ? 'Cargando…'
                  : 'Haz clic para ver las wishlists guardadas'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isAuthenticated ||
          !loaded ||
          (isAuthenticated && loaded && !lastOwner && desktopOwners.length === 0) ? (
            <>
              <div className="flex md:hidden">
                <SkeletonPreviewChip />
              </div>
              <div className="hidden gap-2 md:flex">
                <SkeletonPreviewChip />
                <SkeletonPreviewChip />
              </div>
            </>
          ) : (
            <>
              <div className="flex md:hidden">
                {lastOwner ? <PreviewChip key={lastOwner.id} user={lastOwner} /> : <SkeletonPreviewChip />}
              </div>
              <div className="hidden gap-2 md:flex">
                {desktopOwners.map((u) => (
                  <PreviewChip key={u.id} user={u} />
                ))}
              </div>
            </>
          )}
          <ChevronRightIcon
            className="h-5 w-5 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5 group-hover:text-white sm:h-6 sm:w-6"
            aria-hidden
          />
        </div>
      </Link>
    </div>
  )
}

type WishlistShortcutUser = {
  id: string
  firstName?: string | null
  lastName?: string | null
  profile?: { avatar?: string | null } | null
}

function PreviewChip({ user }: { user: WishlistShortcutUser }) {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuario'
  const label = shortOwnerName(user.firstName ?? null, user.lastName ?? null)
  const initialUrl =
    user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1E1E1E&color=66DEDB&size=64`

  const [src, setSrc] = useState(initialUrl)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-full border-2 border-[#66DEDB]/50 sm:h-12 sm:w-12">
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          sizes="48px"
          unoptimized
          referrerPolicy="no-referrer"
          onError={() =>
            setSrc(
              `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1E1E1E&color=66DEDB&size=64`,
            )
          }
        />
      </div>
      <span className="max-w-[6rem] truncate text-[10px] text-zinc-200 sm:text-[11px]" title={label}>
        {label}
      </span>
    </div>
  )
}

function SkeletonPreviewChip() {
  return (
    <div className="flex flex-col items-center gap-1 opacity-55">
      <div className="h-[46px] w-[46px] shrink-0 rounded-full border-2 border-dashed border-[#66DEDB]/30 bg-white/[0.04] sm:h-12 sm:w-12" />
      <span className="h-3 w-12 rounded bg-white/10 sm:w-14" />
    </div>
  )
}
