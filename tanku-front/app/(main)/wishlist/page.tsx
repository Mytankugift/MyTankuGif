/**
 * Página de Wishlists — fondo y scroll alineados con /friends
 */

'use client'

import { useEffect, Suspense, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { MyWishlists } from '@/components/wishlists/my-wishlists'
import { SavedWishlistsViewer } from '@/components/wishlists/saved-wishlists-viewer'
import { LikedProductsViewer } from '@/components/wishlists/liked-products-viewer'
import { WishlistNav } from '@/components/layout/wishlist-nav'
import { WishlistSavedShortcut } from '@/components/wishlists/wishlist-saved-shortcut'

type WishlistTab = 'liked' | 'mine' | 'saved'

function WishlistPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const prevTabRef = useRef<WishlistTab | null>(null)
  const [savedPanelKey, setSavedPanelKey] = useState(0)

  const activeTab = useMemo((): WishlistTab => {
    const t = searchParams.get('tab')
    if (t === 'mine' || t === 'liked' || t === 'saved') return t
    if (searchParams.get('saved') === 'true') return 'saved'
    return 'mine'
  }, [searchParams])

  useEffect(() => {
    /** La pestaña «Solicitudes» se unificó en Acceso (modal) en Mis wishlists. */
    if (searchParams.get('tab') === 'requests') {
      router.replace('/wishlist?tab=mine', { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    const prev = prevTabRef.current
    if (activeTab === 'saved' && prev !== null && prev !== 'saved') {
      setSavedPanelKey((k) => k + 1)
    }
    prevTabRef.current = activeTab
  }, [activeTab])

  return (
    <div
      className="relative z-0 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
    >
      <WishlistNav />
      <div
        id="wishlist-scroll-root"
        className={clsx(
          'custom-scrollbar relative z-0 min-h-0 w-full flex-1 basis-0 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]',
          'px-4 pt-[max(5rem,calc(env(safe-area-inset-top,0px)+4rem))] pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
          'lg:px-8 lg:pb-8 lg:pt-20 xl:px-10 xl:pt-24',
        )}
        style={{
          marginRight: 0,
          scrollBehavior: 'auto',
          scrollPaddingTop: 'max(env(safe-area-inset-top),12px)',
          scrollPaddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="w-full pb-3 md:pb-4">
          <WishlistSavedShortcut activeTab={activeTab} />

          {activeTab === 'liked' && <LikedProductsViewer />}
          {activeTab === 'mine' && <MyWishlists />}
          {activeTab === 'saved' && <SavedWishlistsViewer key={savedPanelKey} />}
        </div>
      </div>
    </div>
  )
}

export default function WishlistPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-24"
          style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
        >
          <div className="text-center text-gray-400">Cargando...</div>
        </div>
      }
    >
      <WishlistPageContent />
    </Suspense>
  )
}
