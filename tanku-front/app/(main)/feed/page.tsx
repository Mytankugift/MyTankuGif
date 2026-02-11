'use client'

import { useState, useEffect } from 'react'
import { FeedNav } from '@/components/feed/feed-nav'
import { FeedGrid } from '@/components/feed/feed-grid'
import { FeedInfiniteScroll } from '@/components/feed/feed-infinite-scroll'
import { PosterDetailModal } from '@/components/posters/poster-detail-modal'
import { useFeed } from '@/lib/hooks/use-feed'
import { useInfiniteScroll } from '@/lib/hooks/use-infinite-scroll'
import { apiClient } from '@/lib/api/client'
import './feed-grid.css'

export default function FeedPage() {
  const [categories, setCategories] = useState<{ id: string | number; name: string; image?: string | null }[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false)

  // Cargar categorías
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get<{ id: string; name: string; handle: string }[]>('/api/v1/categories')
        if (response.success && Array.isArray(response.data)) {
          setCategories(response.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            image: c.image || null,
          })))
        }
      } catch (error) {
        console.error('Error cargando categorías:', error)
      }
    }
    fetchCategories()
  }, [])

  // Hook del feed (filtra items sin imágenes automáticamente)
  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    nextCursorToken,
    loadMore,
    updateItem,
    removeItem,
  } = useFeed({
    categoryId: selectedCategoryId,
    searchQuery,
  })

  // Hook de infinite scroll (solo funciona si hay nextCursorToken)
  const { sentinelRef } = useInfiniteScroll({
    hasMore: hasMore && !!nextCursorToken,
    isLoading: isLoadingMore,
    nextCursorToken,
    onLoadMore: loadMore,
  })

  // Handle scroll para mostrar/ocultar header
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollContainer = document.querySelector('.custom-scrollbar') as HTMLElement
          if (!scrollContainer) {
            ticking = false
            return
          }

          const scrollTop = scrollContainer.scrollTop

          if (scrollTop <= 5) {
            setIsHeaderVisible(true)
            setLastScrollY(scrollTop)
            ticking = false
            return
          }

          if (scrollTop > lastScrollY && scrollTop > 200) {
            setIsHeaderVisible(false)
          } else if (scrollTop < lastScrollY) {
            setIsHeaderVisible(true)
          }

          setLastScrollY(scrollTop)
          ticking = false
        })
      }
    }

    const scrollContainer = document.querySelector('.custom-scrollbar')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [lastScrollY])

  return (
    <div
      className="w-full overflow-x-hidden flex flex-col transition-colors duration-300"
      style={{ backgroundColor: '#1E1E1E', height: 'calc(100vh - 0px)' }}
    >
      <FeedNav
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isHeaderVisible={isHeaderVisible}
      />

      <div
        className="flex-1 overflow-y-auto px-2 sm:px-3 md:px-4 py-2 sm:py-4 md:py-5 custom-scrollbar transition-all duration-300 ease-in-out"
        style={{
          paddingTop: isHeaderVisible ? '190px' : '20px',
          marginRight: '0',
          scrollBehavior: 'smooth',
        }}
      >
        {isLoading && items.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-white">Cargando feed...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-white">No hay contenido en el feed</div>
          </div>
        ) : (
          <>
            <FeedGrid 
              items={items}
              onPosterClick={(poster) => {
                setSelectedPosterId(poster.id)
                setIsPosterModalOpen(true)
              }}
            />
            <FeedInfiniteScroll
              hasMore={hasMore && !!nextCursorToken}
              isLoadingMore={isLoadingMore}
              sentinelRef={sentinelRef}
            />
          </>
        )}
      </div>

      {/* Modal de detalle de post */}
      <PosterDetailModal
        isOpen={isPosterModalOpen}
        posterId={selectedPosterId}
        initialPosterData={selectedPosterId ? items.find(item => item.id === selectedPosterId && item.type === 'poster') as any : null}
        onClose={() => {
          setIsPosterModalOpen(false)
          setSelectedPosterId(null)
        }}
        onPostDeleted={(posterId) => {
          // Remover el post del feed sin recargar
          removeItem(posterId)
        }}
        onPostUpdated={(posterId, updates) => {
          // Actualizar solo ese item en el feed (sin recargar)
          updateItem(posterId, updates)
        }}
      />
    </div>
  )
}
