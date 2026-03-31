'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FeedNav } from '@/components/feed/feed-nav'
import { FeedGrid } from '@/components/feed/feed-grid'
import { FeedInfiniteScroll } from '@/components/feed/feed-infinite-scroll'
import { PosterDetailModal } from '@/components/posters/poster-detail-modal'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { useFeed } from '@/lib/hooks/use-feed'
import { useFeedInit } from '@/lib/hooks/use-feed-init'
import { useInfiniteScroll } from '@/lib/hooks/use-infinite-scroll'
import { useAuthStore } from '@/lib/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { FEED_RESET_FILTERS_EVENT } from '@/lib/constants/feed-events'
import './feed-grid.css'

export default function FeedPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  
  // ✅ MOVER TODOS LOS HOOKS ANTES DEL RETURN CONDICIONAL
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  /** Texto del input (cambia al escribir) */
  const [searchInput, setSearchInput] = useState('')
  /** Texto enviado al API tras debounce o Enter (búsqueda de productos) */
  const [searchQuery, setSearchQuery] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false)
  const [headerPadding, setHeaderPadding] = useState('220px')
  const hasInitialized = useRef(false)

  // Proteger ruta: redirigir no autenticados a landing
  useEffect(() => {
    if (!isAuthenticated) {
      logger.log('[FEED] Usuario no autenticado, redirigiendo a landing...')
      router.replace('/')
    }
  }, [isAuthenticated, router])

  // Debounce: no llamar al API en cada tecla; sí al terminar de escribir (~450 ms) o al pulsar Enter (onSearchCommit)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim())
    }, 450)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchInput])

  const commitFeedSearch = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    setSearchQuery(searchInput.trim())
  }, [searchInput])

  // Calcular paddingTop dinámicamente según el dispositivo
  useEffect(() => {
    const calculatePadding = () => {
      if (typeof window === 'undefined') return
      
      const width = window.innerWidth
      
      // Móvil (< 640px)
      if (width < 640) {
        setHeaderPadding('230px')
      }
      // Tablet (640px - 1024px) — nav + stories más altos; evitar solapamiento con cards
      else if (width >= 640 && width < 1024) {
        setHeaderPadding('200px')
      }
      // Desktop (>= 1024px)
      else {
        setHeaderPadding('220px')
      }
    }

    calculatePadding()
    window.addEventListener('resize', calculatePadding)
    return () => window.removeEventListener('resize', calculatePadding)
  }, [])

  // ✅ Usar endpoint batch SOLO en la carga inicial (sin filtros)
  const feedInit = useFeedInit()
  
  // Determinar qué datos usar: batch init (solo primera vez sin filtros) o feed normal (con filtros)
  const hasFilters = !!selectedCategoryId || !!searchQuery
  const previousFiltersRef = useRef({ categoryId: null as string | null, searchQuery: '' })
  
  // Detectar cambio de filtros
  const filtersChanged = 
    previousFiltersRef.current.categoryId !== selectedCategoryId || 
    previousFiltersRef.current.searchQuery !== searchQuery
  
  // Resetear hasInitialized cuando se cambia a "Todas" (sin filtros) después de haber filtrado
  useEffect(() => {
    if (filtersChanged) {
      if (!hasFilters && hasInitialized.current) {
        // Si volvemos a "Todas" después de haber filtrado, resetear para usar feedInit de nuevo
        hasInitialized.current = false
      }
      previousFiltersRef.current = { categoryId: selectedCategoryId, searchQuery }
    }
  }, [hasFilters, selectedCategoryId, searchQuery, filtersChanged])
  
  // Si feedInit tiene items y no hay filtros, usar feedInit
  // Esto permite que cuando se cambia a "Todas", se usen los datos de feedInit si están disponibles
  // Si filtersChanged es true pero volvemos a "Todas", usar feedInit si tiene datos
  const useInitData = !hasFilters && feedInit.items.length > 0 && !feedInit.isLoading
  
  // ✅ Solo ejecutar useFeed si hay filtros O si feedInit ya cargó (para loadMore)
  // Esto evita llamadas duplicadas en la carga inicial
  const {
    items: feedItems,
    isLoading: feedLoading,
    isLoadingMore,
    hasMore,
    nextCursorToken,
    loadMore,
    updateItem,
    removeItem,
  } = useFeed(
    {
      categoryId: selectedCategoryId,
      searchQuery,
    },
    {
      // ✅ Pasar flag para deshabilitar carga inicial solo si estamos usando feedInit Y tiene datos
      // Si cambiamos a "Todas" y feedInit no tiene datos, permitir que useFeed cargue
      skipInitialLoad: useInitData && feedInit.items.length > 0,
    }
  )
  
  // Una vez que feedInit carga, marcar como inicializado
  useEffect(() => {
    if (!feedInit.isLoading && feedInit.items.length > 0) {
      hasInitialized.current = true
    }
  }, [feedInit.isLoading, feedInit.items.length])
  
  // Datos finales a usar
  const items = useInitData ? feedInit.items : feedItems
  const isLoading = useInitData ? feedInit.isLoading : feedLoading
  const categories = feedInit.categories || []

  // Hook de infinite scroll (solo funciona si hay nextCursorToken)
  // Usar nextCursorToken del feed normal (no del init) para loadMore
  const currentNextCursorToken = useInitData ? feedInit.nextCursorToken : nextCursorToken
  const currentHasMore = useInitData ? feedInit.hasMore : hasMore
  const { sentinelRef } = useInfiniteScroll({
    hasMore: currentHasMore && !!currentNextCursorToken,
    isLoading: isLoadingMore,
    nextCursorToken: currentNextCursorToken,
    onLoadMore: hasFilters ? loadMore : feedInit.loadMore, // Usar loadMore apropiado
  })

  // Handle scroll para mostrar/ocultar header y feed barrier
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
  }, [lastScrollY, isAuthenticated])

  // Sidebar / nav móvil: "My TANKU" en /feed → limpiar filtros como "Todas" + búsqueda vacía
  useEffect(() => {
    const onResetFilters = () => {
      setSelectedCategoryId(null)
      setSearchInput('')
      setSearchQuery('')
      requestAnimationFrame(() => {
        const scrollContainer = document.querySelector('.custom-scrollbar') as HTMLElement | null
        if (scrollContainer) scrollContainer.scrollTop = 0
      })
    }
    window.addEventListener(FEED_RESET_FILTERS_EVENT, onResetFilters)
    return () => window.removeEventListener(FEED_RESET_FILTERS_EVENT, onResetFilters)
  }, [])

  // ✅ AHORA SÍ: return condicional DESPUÉS de todos los hooks
  // Si no está autenticado, no renderizar nada (se está redirigiendo)
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#1E1E1E' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-white">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full overflow-x-hidden flex flex-col transition-colors duration-300"
      style={{ backgroundColor: '#1E1E1E', height: 'calc(100vh - 0px)' }}
    >
      <FeedNav
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchCommit={commitFeedSearch}
        isHeaderVisible={isHeaderVisible}
        // ✅ Pasar datos desde feedInit para evitar llamadas duplicadas
        conversations={useInitData ? feedInit.conversations : undefined}
        unreadCount={useInitData ? feedInit.unreadCounts.chat : undefined}
        stories={useInitData ? feedInit.stories : undefined}
        notifications={useInitData ? feedInit.notifications : undefined}
        notificationsUnreadCount={useInitData ? feedInit.unreadCounts.notifications : undefined}
      />

      <div
        className="flex-1 overflow-y-auto px-2 pt-2 max-md:pb-[max(5.5rem,calc(5rem+env(safe-area-inset-bottom,0px)))] sm:px-3 sm:pt-4 md:px-4 md:py-5 custom-scrollbar transition-all duration-300 ease-in-out"
        style={{
          paddingTop: isHeaderVisible ? headerPadding : '20px',
          marginRight: '0',
          scrollBehavior: 'smooth',
        }}
      >
        {isLoading && items.length === 0 ? (
          <FeedSkeleton />
        ) : items.length === 0 && !feedInit.isLoading && !isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-white">No hay contenido en el feed</div>
          </div>
        ) : items.length > 0 ? (
          <>
            <FeedGrid 
              items={items}
              isAuthenticated={isAuthenticated}
              onPosterClick={(poster) => {
                setSelectedPosterId(poster.id)
                setIsPosterModalOpen(true)
              }}
            />
            <FeedInfiniteScroll
              hasMore={currentHasMore && !!currentNextCursorToken}
              isLoadingMore={isLoadingMore}
              sentinelRef={sentinelRef}
            />
            
          </>
        ) : null}
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
