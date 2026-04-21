'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FeedNav } from '@/components/feed/feed-nav'
import { FeedCategoryBar } from '@/components/feed/feed-category-bar'
import { FeedStoriesStrip } from '@/components/feed/feed-stories-strip'
import { FeedCategoriesMobileModal } from '@/components/feed/feed-categories-mobile-modal'
import { FeedCategoryActivePill } from '@/components/feed/feed-category-active-pill'
import { FeedGrid } from '@/components/feed/feed-grid'
import { FeedInfiniteScroll } from '@/components/feed/feed-infinite-scroll'
import { PosterDetailModal } from '@/components/posters/poster-detail-modal'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { useFeed } from '@/lib/hooks/use-feed'
import { useFeedInit } from '@/lib/hooks/use-feed-init'
import { useInfiniteScroll } from '@/lib/hooks/use-infinite-scroll'
import { useFeedScrollNav } from '@/lib/hooks/use-feed-scroll-nav'
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
  const feedScrollRootRef = useRef<HTMLDivElement | null>(null)
  const [feedScrollAttached, setFeedScrollAttached] = useState(false)
  const setFeedScrollRef = useCallback((node: HTMLDivElement | null) => {
    feedScrollRootRef.current = node
    setFeedScrollAttached(!!node)
  }, [])
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  const hasInitialized = useRef(false)
  const [feedExplorarActivated, setFeedExplorarActivated] = useState(false)
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false)

  const feedNavScroll = useFeedScrollNav(feedScrollRootRef, feedScrollAttached)

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

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /**
   * Hueco inicial del scroll: el nav va superpuesto con blur/translucidez (Safari UX).
   * Casi todo el alto del chrome es “overlay”; solo respetamos safe area (+ mínimo).
   */
  const contentPaddingTop = (() => {
    const w = viewportWidth
    const { minimalMode, compactMid } = feedNavScroll
    const safeOnly = 'max(10px, env(safe-area-inset-top))'

    if (w < 768) {
      return safeOnly
    }

    // Tablet/desktop: hueco acorde al header fijo (eslogán + strip historias + buscador + categorías).
    // Valores más altos en reposo para que las cards no queden bajo el chrome al abrir el feed.
    if (minimalMode) {
      return w < 1024 ? '132px' : '140px'
    }
    if (compactMid) {
      return w < 1024 ? '212px' : '224px'
    }
    return w < 1024 ? '300px' : '312px'
  })()

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

  const activeCategoryFilter = useMemo(() => {
    if (!selectedCategoryId) return null
    const c = categories.find((x) => String(x.id) === String(selectedCategoryId))
    if (!c) return null
    return { id: c.id, name: c.name, image: c.image ?? null }
  }, [categories, selectedCategoryId])

  /**
   * Hueco superior del scroll (`#feed-scroll-root`):
   * - Con pastilla de categoría (fixed): bajo nav + pastilla.
   * - Sin filtro de categoría en móvil: reservar nav + zona donde va el strip de historias (sticky); si solo usamos safe area, las historias quedan debajo del nav.
   */
  const scrollAreaPaddingTop = useMemo(() => {
    if (activeCategoryFilter) {
      return 'max(70px, calc(env(safe-area-inset-top) + 3.25rem))'
    }
    if (viewportWidth < 768) {
      return 'max(70px, calc(env(safe-area-inset-top) + 3.5rem))'
    }
    return contentPaddingTop
  }, [activeCategoryFilter, viewportWidth, contentPaddingTop])

  // Hook de infinite scroll (solo funciona si hay nextCursorToken)
  // Usar nextCursorToken del feed normal (no del init) para loadMore
  const currentNextCursorToken = useInitData ? feedInit.nextCursorToken : nextCursorToken
  const currentHasMore = useInitData ? feedInit.hasMore : hasMore
  const isLoadingMoreCombined = useInitData ? feedInit.isLoadingMore : isLoadingMore

  const handleFeedLoadMore = useCallback(() => {
    if (hasFilters) return loadMore()
    return feedInit.loadMore()
  }, [hasFilters, loadMore, feedInit.loadMore])

  const { sentinelRef } = useInfiniteScroll({
    scrollRootRef: feedScrollRootRef,
    scrollRootReady: feedScrollAttached,
    hasMore: currentHasMore && !!currentNextCursorToken,
    isLoadingMore: isLoadingMoreCombined,
    nextCursorToken: currentNextCursorToken,
    onLoadMore: handleFeedLoadMore,
    rootMargin: '0px 0px 400px 0px',
  })

  // Sidebar / nav móvil: "My TANKU" en /feed → limpiar filtros como "Todas" + búsqueda vacía
  useEffect(() => {
    const onResetFilters = () => {
      setSelectedCategoryId(null)
      setSearchInput('')
      setSearchQuery('')
      requestAnimationFrame(() => {
        if (feedScrollRootRef.current) feedScrollRootRef.current.scrollTop = 0
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
        style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
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
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
    >
      <div
        className="fixed inset-x-0 top-0 z-40 flex flex-col flex-shrink-0 overflow-visible border-b border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.35)] max-md:bg-[rgba(25,30,35,0.62)] max-md:backdrop-blur-xl max-md:backdrop-saturate-150 md:inset-x-auto md:left-36 md:right-0 md:bg-[var(--color-surface-191e23-20)] md:backdrop-blur-none md:backdrop-saturate-100 md:[-webkit-backdrop-filter:none] lg:left-[208px]"
      >
        <FeedNav
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearchCommit={commitFeedSearch}
          feedNavScroll={feedNavScroll}
          conversations={useInitData ? feedInit.conversations : undefined}
          unreadCount={useInitData ? feedInit.unreadCounts.chat : undefined}
          stories={useInitData ? feedInit.stories : undefined}
          notifications={useInitData ? feedInit.notifications : undefined}
          notificationsUnreadCount={useInitData ? feedInit.unreadCounts.notifications : undefined}
          onOpenCategoriesModal={() => setCategoriesModalOpen(true)}
          feedExplorarActivated={feedExplorarActivated}
          onFeedExplorarActivated={() => setFeedExplorarActivated(true)}
          showStoriesStripInFixedNav
          activeCategoryFilter={activeCategoryFilter}
          onClearCategoryFilter={() => setSelectedCategoryId(null)}
        />
        <div className="hidden md:block">
          <FeedCategoryBar
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
            feedNavScroll={feedNavScroll}
          />
        </div>
      </div>

      {/* Pastilla categoría: flotante en móvil (no baja con el scroll) */}
      {activeCategoryFilter && (
        <div
          className="pointer-events-none fixed left-3 z-[42] md:hidden"
          style={{
            top: 'max(calc(env(safe-area-inset-top) + 5.75rem), 6.25rem)',
          }}
        >
          <div className="pointer-events-auto rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.55)] ring-1 ring-black/30">
            <FeedCategoryActivePill
              category={activeCategoryFilter}
              compact
              onClear={() => setSelectedCategoryId(null)}
            />
          </div>
        </div>
      )}

      <div
        ref={setFeedScrollRef}
        id="feed-scroll-root"
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-[env(safe-area-inset-bottom,0px)] pt-2 sm:px-3 sm:pt-4 md:px-4 md:py-5 md:pb-5 transition-[padding-top] duration-300 ease-out [-webkit-overflow-scrolling:touch]"
        style={{
          paddingTop: scrollAreaPaddingTop,
          marginRight: '0',
          scrollBehavior: 'smooth',
          scrollPaddingTop: 'max(env(safe-area-inset-top),12px)',
          scrollPaddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {!activeCategoryFilter && (
          <FeedStoriesStrip
            className="sticky top-0 z-[60] -mx-2 mb-3 px-2 backdrop-blur-md md:hidden"
            style={{
              backgroundColor: 'rgba(25, 30, 35, 0.42)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
            showStoriesStrip={feedNavScroll.showStoriesStrip}
            stories={useInitData ? feedInit.stories : undefined}
            feedExplorarActivated={feedExplorarActivated}
            onExplorarActivated={() => setFeedExplorarActivated(true)}
          />
        )}
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

      <FeedCategoriesMobileModal
        open={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        categories={categories}
        onPickCategory={(categoryId) => setSelectedCategoryId(categoryId)}
      />
    </div>
  )
}
