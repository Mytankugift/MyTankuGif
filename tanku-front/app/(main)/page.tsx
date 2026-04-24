'use client'

import React, { useState, useEffect, useLayoutEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { LandingNav } from '@/components/feed/landing-nav'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { useLandingFeed } from '@/lib/hooks/use-landing-feed'
import { useFeedScrollNav } from '@/lib/hooks/use-feed-scroll-nav'
import { useCategories } from '@/lib/hooks/use-categories'
import { useAuthStore } from '@/lib/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import './feed/feed-grid.css'

// ✅ Lazy load del grid (puede ser pesado)
const LandingGrid = dynamic(
  () => import('@/components/feed/landing-grid').then(mod => ({ default: mod.LandingGrid })),
  { 
    loading: () => <FeedSkeleton />,
    ssr: true // Mantener SSR para SEO
  }
)

// ✅ Lazy load del modal de video (solo cuando se necesita)
const VideoModal = dynamic(
  () => import('@/components/feed/video-modal').then(mod => ({ default: mod.VideoModal })),
  { ssr: false } // No renderizar en servidor
)

// URL del video de bienvenida en S3
const WELCOME_VIDEO_URL = 'https://tanku-bucket-us-east-2.s3.us-east-2.amazonaws.com/dev/videos/3e7683ee-fce6-4e2f-82b9-194db1e659d9.mp4'

/**
 * Aire bajo el nav fijo: medimos el nodo; este gap evita que la primera fila de cards “pegue” al borde inferior del nav.
 */
const LANDING_NAV_CONTENT_GAP_PX = 12

/** Reserva mínima (antes de medir / si falla la medida). Generosa: nav + búsqueda + categorías varía por breakpoint. */
function landingTopReserveFallbackPx(viewportW: number): number {
  if (viewportW < 768) return 100
  if (viewportW < 1024) return 100
  return 100
}

function LandingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setToken, isAuthenticated } = useAuthStore()
  const hasRedirected = useRef(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  /** Mismo hook que /feed, con scroll “externo”: lee `app-main` y `window` (landing en md+ a menudo scrollea el documento). */
  const feedScrollRootRef = useRef<HTMLDivElement | null>(null)
  const feedNavScroll = useFeedScrollNav(feedScrollRootRef, false, true)
  /** Altura medida del nav fijo; el contenido baja con un spacer explícito (más fiable que solo padding en flex + fixed). */
  const [navChromeHeightPx, setNavChromeHeightPx] = useState<number | null>(null)
  const landingNavRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Usar hook cacheado para categorías
  const { categories } = useCategories()

  // Manejar parámetros de autenticación
  useEffect(() => {
    if (hasRedirected.current) return

    const tokenParam = searchParams.get('token')
    const error = searchParams.get('error')
    const redirect = searchParams.get('redirect')

    // Si hay error, solo loguear (no redirigir, mostrar landing)
    if (error) {
      hasRedirected.current = true
      logger.error('⚠️ [LANDING] Error en autenticación recibido:', error)
      return
    }

    // Si hay token en la URL, establecerlo y redirigir
    if (tokenParam) {
      hasRedirected.current = true
      logger.log('✅ [LANDING] Token encontrado en URL, estableciendo...')
      setToken(tokenParam)
      
      if (redirect) {
        logger.log(`🔄 [LANDING] Redirigiendo a ${redirect} después del login...`)
        router.replace(redirect)
      } else {
        router.replace('/feed')
      }
      return
    }

    // Si está autenticado y no hay parámetros especiales, redirigir a feed
    if (isAuthenticated && !tokenParam && !error) {
      hasRedirected.current = true
      router.replace('/feed')
      return
    }
  }, [searchParams, router, setToken, isAuthenticated])

  // Las categorías se cargan con el hook useCategories (cacheado)

  // Cargar feed de productos (hasta 100, sin posts)
  // Nota: searchQuery no se pasa al hook, la búsqueda se hace localmente
  const {
    items: allItems,
    isLoading,
    error: feedError,
  } = useLandingFeed({
    categoryId: selectedCategoryId,
  })

  // Nav `fixed` fuera del flujo: medimos el ref antes del paint (useLayoutEffect) y resizeamos el spacer.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const el = landingNavRef.current ?? document.getElementById('landing-nav-chrome')
    if (!el) return

    const update = () => {
      const h = el.getBoundingClientRect().height
      if (h > 0) setNavChromeHeightPx(Math.round(h * 10) / 10)
    }

    update()
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(update)
    })
    ro.observe(el)
    window.addEventListener('resize', update)
    const t1 = window.setTimeout(update, 120)
    const t2 = window.setTimeout(update, 500)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [categories.length, isLoading, feedNavScroll.minimalMode, feedNavScroll.compactMid])

  // Filtrar productos localmente basado en searchQuery
  // IMPORTANTE: Este hook debe ir ANTES del return condicional
  const items = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return allItems
    }
    
    const query = searchQuery.toLowerCase().trim()
    return allItems.filter((item) => {
      if (item.type !== 'product') return false
      const title = (item.title || '').toLowerCase()
      const category = (item.category?.name || '').toLowerCase()
      return title.includes(query) || category.includes(query)
    })
  }, [allItems, searchQuery])

  // Mostrar modal de video automáticamente (solo una vez por sesión)
  // IMPORTANTE: Todos los hooks deben ir ANTES del return condicional
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const hasShownInSession = sessionStorage.getItem('videoModalShown') === 'true'
    
    if (!isVideoModalOpen && !hasShownInSession) {
      const timer = setTimeout(() => {
        setIsVideoModalOpen(true)
        sessionStorage.setItem('videoModalShown', 'true')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isVideoModalOpen])

  // Si está autenticado o hay token, mostrar loading mientras redirige
  // IMPORTANTE: Este return debe ir DESPUÉS de TODOS los hooks
  const tokenParam = searchParams.get('token')
  const navGap = LANDING_NAV_CONTENT_GAP_PX
  const landingSpacerMinPx = Math.max(
    navChromeHeightPx != null ? navChromeHeightPx + navGap : 0,
    landingTopReserveFallbackPx(viewportWidth) + navGap
  )

  if (tokenParam || (isAuthenticated && !hasRedirected.current)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex w-full max-md:min-h-screen flex-col overflow-x-hidden transition-colors duration-300 md:min-h-0 md:flex-1"
      style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
    >
      <LandingNav
        ref={landingNavRef}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        feedNavScroll={feedNavScroll}
      />

      <div
        className="px-2 pb-2 transition-all duration-300 ease-in-out max-md:flex-none max-md:overflow-visible max-md:px-3 max-md:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:px-3 sm:py-4 md:px-4 md:py-5"
        style={{
          marginRight: '0',
          scrollBehavior: 'auto',
          overscrollBehavior: 'auto',
        }}
      >
        {/* Spacer: el nav es position:fixed (fuera del flujo). Sin este bloque, el grid empezaría en y=0 bajo el nav. */}
        <div
          className="shrink-0 w-full"
          aria-hidden
          style={{ minHeight: landingSpacerMinPx }}
        />
        {isLoading && items.length === 0 ? (
          <FeedSkeleton />
        ) : feedError ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-white">Error al cargar el feed: {feedError.message}</div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-white">No hay productos disponibles</div>
          </div>
        ) : (
          <>
            <LandingGrid items={items} />
            {/* Footer pequeño */}
            <footer className="w-full py-6 mt-8 text-center">
              <p className="text-gray-500 text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>
                © Tanku 2026
              </p>
            </footer>
          </>
        )}
      </div>

      {/* Modal de video */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={WELCOME_VIDEO_URL}
      />
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73FFA2] mx-auto mb-4"></div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  )
}

