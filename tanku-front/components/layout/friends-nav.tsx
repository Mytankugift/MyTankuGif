/**
 * Nav para /friends
 * Misma franja de historias que /feed (FeedStoriesStrip): móvil en el scroll; md+ en el chrome fijo.
 */

'use client'

import { useState } from 'react'
import { BaseNav } from './base-nav'
import { FeedStoriesStrip } from '@/components/feed/feed-stories-strip'
import type { FeedNavScrollState } from '@/lib/hooks/use-feed-scroll-nav'

interface FriendsNavProps {
  onSearch?: (query: string) => void
  initialSearchQuery?: string
  feedNavScroll: FeedNavScrollState
  stories?: any[]
  feedExplorarActivated: boolean
  onFeedExplorarActivated: () => void
  /** false: no mostrar strip en el nav fijo (solo usa el strip del scroll en móvil si lo montas fuera) */
  showStoriesStripInFixedNav?: boolean
}

export function FriendsNav({
  onSearch,
  initialSearchQuery = '',
  feedNavScroll,
  stories,
  feedExplorarActivated,
  onFeedExplorarActivated,
  showStoriesStripInFixedNav = true,
}: FriendsNavProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    onSearch?.(value)
  }

  const searchContent = (
    <div className="relative w-full">
      <div className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2 transform">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 41 42"
          fill="none"
          className="h-5 w-5"
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
        onChange={handleSearchChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && searchQuery.trim()) {
            onSearch?.(searchQuery.trim())
          }
        }}
        className="tanku-pill-search-input w-full rounded-full border border-white/10 py-2 pl-10 pr-3 transition-all duration-200 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      />
    </div>
  )

  return (
    <div className="w-full bg-transparent">
      <BaseNav
        showStories={false}
        mobileTranslucentNav
        canHide={false}
        isVisible={true}
        pageTitle="Amigos"
        pageSubtitle="Gestiona tus conexiones y descubre nuevas personas"
        pageTitleColor="#66DEDB"
        additionalContent={searchContent}
      />
      {showStoriesStripInFixedNav && (
        <div className="hidden w-full px-2 pb-0 pt-2 sm:px-3 sm:pt-3 md:block md:px-4 md:pt-4">
          <FeedStoriesStrip
            showStoriesStrip={feedNavScroll.showStoriesStrip}
            stories={stories}
            feedExplorarActivated={feedExplorarActivated}
            onExplorarActivated={onFeedExplorarActivated}
          />
        </div>
      )}
    </div>
  )
}
