/**
 * Lista desplegable bajo el buscador /friends — resultados locales + API sin filtrar el contenido de la página
 */

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export interface FriendsNavSearchHit {
  key: string
  href: string
  avatar: string | null | undefined
  title: string
  subtitle?: string
}

interface FriendsNavSearchDropdownProps {
  hits: FriendsNavSearchHit[]
  loading: boolean
}

function fallbackAvatarUrl(label: string) {
  const name = label.trim() || 'U'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1E1E1E&color=73FFA2&size=128&bold=true`
}

export function FriendsNavSearchDropdown({ hits, loading }: FriendsNavSearchDropdownProps) {
  return (
    <div
      className="absolute left-0 right-0 top-full z-[200] mt-1.5 max-h-[min(22rem,calc(100vh-14rem))] overflow-hidden rounded-xl border border-white/[0.1] bg-[rgba(21,26,31,0.98)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
      role="listbox"
      aria-label="Resultados de búsqueda"
      onMouseDown={(e) => e.preventDefault()}
    >
      {loading ? (
        <div className="border-b border-white/[0.06] px-3 py-3 text-center text-xs text-zinc-400">
          Buscando…
        </div>
      ) : null}

      {!loading && hits.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-zinc-500">Sin coincidencias</div>
      ) : null}

      {hits.length > 0 ? (
        <ul className="custom-scrollbar max-h-[min(20rem,calc(100vh-15rem))] overflow-y-auto py-1">
          {hits.map((hit) => (
            <li key={hit.key} role="option">
              <Link
                href={hit.href}
                className="flex min-h-[3rem] items-center gap-3 px-3 py-2 transition-colors hover:bg-white/[0.06]"
              >
                <SearchHitAvatar avatar={hit.avatar} label={hit.title} />
                <div className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium text-zinc-100">{hit.title}</span>
                  {hit.subtitle ? (
                    <span className="mt-0.5 block truncate text-xs text-zinc-500">{hit.subtitle}</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function SearchHitAvatar({ avatar, label }: { avatar: string | null | undefined; label: string }) {
  const [src, setSrc] = useState(() => initialSrc(avatar, label))

  return (
    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-zinc-800/90">
      <Image
        src={src}
        alt=""
        width={40}
        height={40}
        className="h-full w-full object-cover"
        unoptimized
        referrerPolicy="no-referrer"
        onError={() => {
          const fb = fallbackAvatarUrl(label)
          if (src !== fb) setSrc(fb)
        }}
      />
    </span>
  )
}

function initialSrc(avatar: string | null | undefined, label: string): string {
  return avatar?.trim() || fallbackAvatarUrl(label)
}
