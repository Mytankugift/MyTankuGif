/**
 * Página de Wishlists
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MyWishlists } from '@/components/wishlists/my-wishlists'
import { SavedWishlistsViewer } from '@/components/wishlists/saved-wishlists-viewer'
import { LikedProductsViewer } from '@/components/wishlists/liked-products-viewer'
import { WishlistNav } from '@/components/layout/wishlist-nav'
import { WishlistAccessRequests } from '@/components/wishlists/wishlist-access-requests'
import { StoriesCarousel } from '@/components/stories/stories-carousel'
import { useStories } from '@/lib/hooks/use-stories'
import { useAuthStore } from '@/lib/stores/auth-store'

// Componente interno que usa useSearchParams
function WishlistPageContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'liked' | 'mine' | 'saved' | 'requests'>('liked')
  
  // Si viene con ?saved=true, activar el tab de guardadas
  useEffect(() => {
    if (searchParams.get('saved') === 'true') {
      setActiveTab('saved')
    }
  }, [searchParams])

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
            onClick={() => setActiveTab('liked')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'liked'
                ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Me gusta
          </button>
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
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'requests'
                ? 'text-[#73FFA2] border-b-2 border-[#73FFA2]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Solicitudes de Acceso
          </button>
        </div>

          {/* Contenido según tab */}
          {activeTab === 'liked' && <LikedProductsViewer />}
          {activeTab === 'mine' && <MyWishlists />}
          {activeTab === 'saved' && <SavedWishlistsViewer />}
          {activeTab === 'requests' && <WishlistAccessRequests />}
        </div>
      </div>
    </>
  )
}

// Componente principal con Suspense boundary
export default function WishlistPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-4 sm:p-6 md:p-8 pt-20 sm:pt-24 md:pt-28" style={{ backgroundColor: '#1E1E1E' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-400">Cargando...</div>
        </div>
      </div>
    }>
      <WishlistPageContent />
    </Suspense>
  )
}

