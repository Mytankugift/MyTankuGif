/**
 * Nav para /friends
 * Incluye buscador personalizado y botones
 */

'use client'

import { useState } from 'react'
import { BaseNav } from './base-nav'

interface FriendsNavProps {
  /** Callback cuando el usuario busca */
  onSearch?: (query: string) => void
  /** Valor inicial del buscador */
  initialSearchQuery?: string
}

export function FriendsNav({ onSearch, initialSearchQuery = '' }: FriendsNavProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    onSearch?.(value)
  }

  const searchContent = (
    <div className="relative w-full">
      <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 z-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 41 42"
          fill="none"
          className="w-5 h-5"
        >
          <path
            d="M26.8334 8.76545L30.1099 22.6447L20.9442 31.156L8.1482 27.8382L4.84774 14.0188L14.8779 5.75197L26.8334 8.76545Z"
            stroke="#262626"
            strokeWidth="3"
          />
          <line
            y1="-1.5"
            x2="20.427"
            y2="-1.5"
            transform="matrix(0.709973 0.704229 -0.70423 0.709971 24.3841 27.5551)"
            stroke="#262626"
            strokeWidth="3"
          />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Buscar amigos..."
        value={searchQuery}
        onChange={handleSearchChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && searchQuery.trim()) {
            onSearch?.(searchQuery.trim())
          }
        }}
        className="w-full pl-10 pr-3 py-2 text-sm bg-white text-black rounded-full border border-gray-300 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20 transition-all duration-200"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      />
    </div>
  )

  return <BaseNav showStories={false} canHide={false} isVisible={true} additionalContent={searchContent} />
}

