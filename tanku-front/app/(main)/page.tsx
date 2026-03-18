'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { LandingNav } from '@/components/feed/landing-nav'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { useLandingFeed } from '@/lib/hooks/use-landing-feed'
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

function LandingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setToken, isAuthenticated } = useAuthStore()
  const hasRedirected = useRef(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [headerPadding, setHeaderPadding] = useState('220px')

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

  // Handle scroll para mostrar/ocultar header
  // IMPORTANTE: Todos los hooks deben ir ANTES del return condicional
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
  if (tokenParam || (isAuthenticated && !hasRedirected.current)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#1E1E1E' }}
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
      className="w-full overflow-x-hidden flex flex-col transition-colors duration-300"
      style={{ backgroundColor: '#1E1E1E', height: 'calc(100vh - 0px)' }}
    >
      <LandingNav
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
          paddingTop: isHeaderVisible ? headerPadding : '20px',
          marginRight: '0',
          scrollBehavior: 'auto', // Cambiar de 'smooth' a 'auto' para evitar problemas de scroll
          overscrollBehavior: 'contain', // Prevenir scroll bounce
        }}
      >
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1E1E1E' }}>
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

