'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FeedNav } from '@/components/feed/feed-nav'
import { FeedGrid } from '@/components/feed/feed-grid'
import { FeedInfiniteScroll } from '@/components/feed/feed-infinite-scroll'
import { PosterDetailModal } from '@/components/posters/poster-detail-modal'
import { VideoModal } from '@/components/feed/video-modal'
import { PromotionalBanner } from '@/components/feed/promotional-banner'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { useFeed } from '@/lib/hooks/use-feed'
import { useFeedInit } from '@/lib/hooks/use-feed-init'
import { useInfiniteScroll } from '@/lib/hooks/use-infinite-scroll'
import { useAuthStore } from '@/lib/stores/auth-store'
import './feed-grid.css'

// URL del video de bienvenida en S3
const WELCOME_VIDEO_URL = 'https://tanku-bucket-us-east-2.s3.us-east-2.amazonaws.com/dev/videos/3e7683ee-fce6-4e2f-82b9-194db1e659d9.mp4'

export default function FeedPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  // Proteger ruta: redirigir no autenticados a landing
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[FEED] Usuario no autenticado, redirigiendo a landing...')
      router.replace('/')
    }
  }, [isAuthenticated, router])

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [headerPadding, setHeaderPadding] = useState('220px')
  const hasInitialized = useRef(false)

  // Calcular paddingTop dinámicamente según el dispositivo
  useEffect(() => {
    const calculatePadding = () => {
      if (typeof window === 'undefined') return
      
      const width = window.innerWidth
      
      // Móvil (< 640px)
      if (width < 640) {
        setHeaderPadding('230px')
      }
      // Tablet (640px - 1024px)
      else if (width >= 640 && width < 1024) {
        setHeaderPadding('170px')
      }
      // Desktop (>= 1024px)
      else {
        setHeaderPadding('180px')
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

  // Mostrar modal de video automáticamente cuando no está logueado (solo una vez por sesión)
  useEffect(() => {
    // Solo ejecutar en el cliente y después de que el componente esté montado
    if (typeof window === 'undefined') return
    
    // Verificar si ya se mostró el modal en esta sesión
    const hasShownInSession = sessionStorage.getItem('videoModalShown') === 'true'
    
    if (!isAuthenticated && !isVideoModalOpen && !hasShownInSession) {
      // Mostrar el modal después de un pequeño delay para que la página cargue
      const timer = setTimeout(() => {
        setIsVideoModalOpen(true)
        sessionStorage.setItem('videoModalShown', 'true')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, isVideoModalOpen])

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
        // ✅ Pasar datos desde feedInit para evitar llamadas duplicadas
        conversations={useInitData ? feedInit.conversations : undefined}
        unreadCount={useInitData ? feedInit.unreadCounts.chat : undefined}
        stories={useInitData ? feedInit.stories : undefined}
        notifications={useInitData ? feedInit.notifications : undefined}
        notificationsUnreadCount={useInitData ? feedInit.unreadCounts.notifications : undefined}
      />

      <div
        className="flex-1 overflow-y-auto px-2 sm:px-3 md:px-4 py-2 sm:py-4 md:py-5 custom-scrollbar transition-all duration-300 ease-in-out"
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

      {/* Modal de video */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={WELCOME_VIDEO_URL}
      />
    </div>
  )
}
