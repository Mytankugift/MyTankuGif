'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FriendDTO, FriendUserDTO } from '@/types/api'
import { isConfirmedMinorFromBirthIso } from '@/lib/utils/user-age'

const MIN_TILE = 72
const GAP = 10

function avatarSrc(u: FriendUserDTO, label: string) {
  const a = u.profile?.avatar?.trim()
  if (a) return a
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label.trim() || '?')}&background=1E1E1E&color=FE9600&size=128&bold=true`
}

/** Prioriza presencia “en redes Tanku”: mutuales, @usuario, foto de perfil. */
function tankuPresenceScore(rel: FriendDTO): number {
  const f = rel.friend
  let score = (rel.mutualFriendsCount ?? 0) * 10
  if (f.username?.trim()) score += 5
  if (f.profile?.avatar?.trim()) score += 2
  return score
}

function sortAlpha(a: FriendDTO, b: FriendDTO): number {
  const na =
    `${a.friend.firstName || ''} ${a.friend.lastName || ''}`.trim() ||
    a.friend.username ||
    ''
  const nb =
    `${b.friend.firstName || ''} ${b.friend.lastName || ''}`.trim() ||
    b.friend.username ||
    ''
  return na.localeCompare(nb, 'es', { sensitivity: 'base' })
}

/** Filas alternas N y N−1 (p. ej. 4-3-4) según ancho. */
function splitIntoStaggerRows<T>(items: T[], baseCols: number): T[][] {
  if (baseCols < 2 || items.length === 0) return items.length ? [items] : []
  const long = baseCols
  const short = Math.max(1, baseCols - 1)
  const rows: T[][] = []
  let needLong = true
  let idx = 0
  while (idx < items.length) {
    const n = needLong ? long : short
    rows.push(items.slice(idx, idx + n))
    idx += n
    needLong = !needLong
  }
  return rows
}

function slotsForStaggerRows(baseCols: number, rowCount: number): number {
  if (baseCols < 2) return rowCount * baseCols
  let total = 0
  let needLong = true
  for (let r = 0; r < rowCount; r++) {
    total += needLong ? baseCols : Math.max(1, baseCols - 1)
    needLong = !needLong
  }
  return total
}

export function StalkerGiftFriendQuickBubbles({
  friends,
  excludedUserId,
  onPick,
  priorityCap = 8,
}: {
  friends: FriendDTO[]
  excludedUserId: string | null
  onPick: (user: FriendUserDTO) => void
  /** Cuántos amigos “en redes” mostrar en la franja superior */
  priorityCap?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [baseCols, setBaseCols] = useState(4)
  const [visibleRest, setVisibleRest] = useState(0)

  const eligible = useMemo(() => {
    return friends
      .filter((r) => r.friend.id !== excludedUserId)
      .filter((r) => !isConfirmedMinorFromBirthIso(r.friend.birthDate ?? null))
  }, [friends, excludedUserId])

  const { priorityRow, restList } = useMemo(() => {
    const ranked = [...eligible].sort((a, b) => {
      const db = tankuPresenceScore(b)
      const da = tankuPresenceScore(a)
      if (db !== da) return db - da
      return sortAlpha(a, b)
    })
    const top = ranked.slice(0, Math.min(priorityCap, ranked.length))
    const topIds = new Set(top.map((t) => t.friend.id))
    const rest = ranked.filter((r) => !topIds.has(r.friend.id)).sort(sortAlpha)
    return { priorityRow: top, restList: rest }
  }, [eligible, priorityCap])

  const measure = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const w = el.offsetWidth
    const cols = Math.max(
      3,
      Math.min(8, Math.floor((w + GAP) / (MIN_TILE + GAP))),
    )
    setBaseCols(cols)
  }, [])

  useEffect(() => {
    measure()
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  const initialRestSlots = useMemo(
    () => slotsForStaggerRows(baseCols, 2),
    [baseCols],
  )
  const loadMoreStep = useMemo(
    () => slotsForStaggerRows(baseCols, 2),
    [baseCols],
  )

  useEffect(() => {
    setVisibleRest(Math.min(initialRestSlots, restList.length))
  }, [restList.length, initialRestSlots, excludedUserId])

  const restRows = useMemo(() => {
    const slice = restList.slice(0, visibleRest)
    return splitIntoStaggerRows(slice, baseCols)
  }, [restList, visibleRest, baseCols])

  const canLoadMore = visibleRest < restList.length

  if (!eligible.length) return null

  return (
    <div ref={containerRef} className="w-full pt-6">
      {priorityRow.length > 0 ? (
        <section className="mb-8">
          <p className="mb-4 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Destacados en redes Tanku
          </p>
          <div className="flex flex-wrap items-end justify-center gap-x-8 gap-y-6 px-1">
            {priorityRow.map((rel, idx) => (
              <BubbleButton
                key={`pri-${rel.id}`}
                user={rel.friend}
                index={idx}
                onPick={() => onPick(rel.friend)}
                compact
              />
            ))}
          </div>
        </section>
      ) : null}

      {restList.length > 0 ? (
        <section>
          <p className="mb-4 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Todos tus amigos
          </p>
          <div className="flex flex-col gap-4">
            {restRows.map((row, ri) => (
              <div
                key={`row-${ri}`}
                className="flex flex-wrap justify-center gap-x-2.5 gap-y-3 sm:gap-x-3"
                style={{ justifyContent: 'center' }}
              >
                {row.map((rel) => (
                  <GridFriendTile
                    key={`all-${rel.id}`}
                    user={rel.friend}
                    onPick={() => onPick(rel.friend)}
                  />
                ))}
              </div>
            ))}
          </div>

          {canLoadMore ? (
            <div className="mt-6 flex justify-center pb-2">
              <button
                type="button"
                onClick={() =>
                  setVisibleRest((v) =>
                    Math.min(v + loadMoreStep, restList.length),
                  )
                }
                className="rounded-full border border-[#FE9600]/45 bg-[#FE9600]/10 px-6 py-2 text-sm font-medium text-[#FE9600] shadow-sm transition hover:bg-[#FE9600]/20"
              >
                Ver más
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function GridFriendTile({
  user,
  onPick,
}: {
  user: FriendUserDTO
  onPick: () => void
}) {
  const label =
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    (user.username?.trim() ? `@${user.username.trim()}` : 'Amigo')
  const initial = avatarSrc(user, label)

  const [broken, setBroken] = useState(false)
  useEffect(() => {
    setBroken(false)
  }, [user.id, user.profile?.avatar])

  const src = broken
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=1E1E1E&color=FE9600&size=128&bold=true`
    : initial

  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Elegir a ${label}`}
      className="group flex min-w-[4.75rem] max-w-[5.75rem] flex-col items-center gap-1.5 px-1"
    >
      <span className="relative block h-[3.85rem] w-[3.85rem] shrink-0 overflow-hidden rounded-full border-2 border-white/15 bg-zinc-900 shadow-md ring-1 ring-black/35 transition hover:border-[#FE9600]/60 hover:shadow-lg group-hover:scale-[1.05]">
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          unoptimized
          sizes="64px"
          onError={() => setBroken(true)}
        />
      </span>
      <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight text-zinc-300">
        {user.username?.trim() ? `@${user.username.trim().slice(0, 14)}` : label.split(' ')[0] ?? '—'}
      </span>
    </button>
  )
}

function BubbleButton({
  user,
  index,
  onPick,
  compact,
}: {
  user: FriendUserDTO
  index: number
  onPick: () => void
  compact?: boolean
}) {
  const label =
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    (user.username ? `@${user.username}` : '?')
  const initial = avatarSrc(user, label)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [user.id, user.profile?.avatar])

  const src = broken
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=1E1E1E&color=FE9600&size=128&bold=true`
    : initial

  const name =
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    (user.username?.trim() ? `@${user.username.trim()}` : 'Amigo')

  const floatClass = index % 2 === 0 ? 'stalkergift-friend-float-a' : 'stalkergift-friend-float-b'

  const sizeCls = compact ? 'h-14 w-14' : 'h-16 w-16'

  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Elegir a ${name} como receptor`}
      className="group flex flex-col items-center gap-1.5"
    >
      <span
        className={`relative block ${sizeCls} overflow-hidden rounded-full border-[3px] border-[#FE9600]/70 bg-zinc-900 shadow-[0_12px_32px_rgba(0,0,0,0.45)] ring-2 ring-black/35 transition-transform duration-200 ${floatClass} group-hover:z-[2] group-hover:scale-[1.08]`}
      >
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          unoptimized
          sizes="64px"
          onError={() => setBroken(true)}
        />
      </span>
      {user.username?.trim() ? (
        <span className="pointer-events-none max-w-[6rem] truncate text-center text-[10px] font-medium leading-tight text-[#FE9600]/90">
          @{user.username.trim()}
        </span>
      ) : (
        <span className="pointer-events-none max-w-[6rem] truncate text-center text-[10px] text-zinc-500">
          {name}
        </span>
      )}
    </button>
  )
}
