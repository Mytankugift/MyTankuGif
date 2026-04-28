'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Solo el campo + icono — el padding lateral lo envuelve BaseNav (additionalContent).
 */
export function FriendsPageSearchBar({
  searchQuery,
  onSearchChange,
  searchDropdownSlot,
  onSearchFocus,
  onSearchBlur,
}: {
  searchQuery: string
  onSearchChange: (v: string) => void
  searchDropdownSlot?: ReactNode
  onSearchFocus?: () => void
  onSearchBlur?: () => void
}) {
  const blurDeferRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => blurDeferRef.current && clearTimeout(blurDeferRef.current), [])
  return (
    <div className="relative w-full min-w-0 pt-1">
      <div className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2 transform">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 41 42"
          fill="none"
          className="h-5 w-5"
          aria-hidden
        >
          <path
            d="M26.8334 8.76545L30.1099 22.6447L20.9442 31.156L8.1482 27.8382L4.84774 14.0188L14.8779 5.75197L26.8334 8.76545Z"
            stroke="#B8C4CC"
            strokeWidth="3"
          />
          <line
            y1="-1.5"
            x2="20.427"
            y2="-1.5"
            transform="matrix(0.709973 0.704229 -0.70423 0.709971 24.3841 27.5551)"
            stroke="#B8C4CC"
            strokeWidth="3"
          />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Buscar por nombre o @usuario…"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => {
          if (blurDeferRef.current) {
            clearTimeout(blurDeferRef.current)
            blurDeferRef.current = null
          }
          onSearchFocus?.()
        }}
        onBlur={() => {
          blurDeferRef.current = setTimeout(() => {
            blurDeferRef.current = null
            onSearchBlur?.()
          }, 220)
        }}
        autoComplete="off"
        className="tanku-pill-search-input w-full rounded-full border border-white/10 bg-[var(--color-surface-191e23-20)] py-2 pl-10 pr-3 text-[15px] text-zinc-100 placeholder:text-[#A7A7A7] transition-all duration-200 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      />
      {searchDropdownSlot}
    </div>
  )
}
