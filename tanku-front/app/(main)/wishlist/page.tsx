/**
 * Página de Wishlists
 */

'use client'

import { useState } from 'react'
import { MyWishlists } from '@/components/wishlists/my-wishlists'
import { SavedWishlistsViewer } from '@/components/wishlists/saved-wishlists-viewer'
import { WishlistNav } from '@/components/layout/wishlist-nav'

export default function WishlistPage() {
  const [activeTab, setActiveTab] = useState<'mine' | 'saved'>('mine')

  return (
    <>
      <WishlistNav />
      <div className="min-h-screen p-4 sm:p-6 md:p-8 pt-20 sm:pt-24 md:pt-28" style={{ backgroundColor: '#1E1E1E' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[#66DEDB] mb-2">Wishlists</h1>
            <p className="text-gray-400">Gestiona tus wishlists y descubre las de tus amigos</p>
          </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'mine'
                ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Mis Wishlists
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'saved'
                ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Wishlists Guardadas
          </button>
        </div>

          {/* Contenido según tab */}
          {activeTab === 'mine' ? <MyWishlists /> : <SavedWishlistsViewer />}
        </div>
      </div>
    </>
  )
}

