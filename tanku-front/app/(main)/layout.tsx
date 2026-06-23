'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import MobileBottomNav from '@/components/layout/mobile-bottom-nav'
import { useAuthInit } from '@/lib/hooks/use-auth-init'
import { useWishlistsInit } from '@/lib/hooks/use-wishlists-init'
import { useAnalyticsConsent } from '@/lib/analytics/use-analytics-consent'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'
import { ProfileNavigationProvider } from '@/lib/context/profile-navigation-context'
import { FeedInitProvider } from '@/lib/context/feed-init-context'
import { DataPolicyConsentModal } from '@/components/auth/data-policy-consent-modal'
import { FloatingChatsManager } from '@/components/chat/floating-chats-manager'
import { useAuthStore } from '@/lib/stores/auth-store'
import { MainLayoutErrorBoundary } from '@/components/layout/main-layout-error-boundary'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Inicializar auth una sola vez
  useAuthInit()
  useWishlistsInit()
  // Sincronizar el gate del tracking con el consentimiento real
  useAnalyticsConsent()
  
  const pathname = usePathname()
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkConsent = async () => {
      if (isAuthenticated && user) {
        // ✅ feedInit ya retorna user, así que checkAuth puede ser redundante
        // Por ahora, solo verificar auth sin delay (feedInit se encarga de cargar user)
        setIsChecking(true)
        await checkAuth()
        setIsChecking(false)
      } else {
        setIsChecking(false)
      }
    }

    checkConsent()
  }, [isAuthenticated, user?.id, checkAuth])

  useEffect(() => {
    // No mostrar el modal si estamos en la página de términos
    if (pathname === '/terms') {
      setShowConsentModal(false)
      return
    }

    if (isAuthenticated && user && !isChecking) {
      // Verificar si requiere aceptación
      const requiresAcceptance = (user as any).requiresDataPolicyAcceptance
      setShowConsentModal(requiresAcceptance === true)
    } else {
      setShowConsentModal(false)
    }
  }, [user, isAuthenticated, isChecking, pathname])

  const isPostDetailRoute = pathname.startsWith('/posts/')
  const isProductRoute = pathname.startsWith('/products/')

  /** Landing (/): scroll del flujo / documento (invitado + SEO). */
  const isLandingRoute = pathname === '/'

  const isProfileRoute = pathname === '/profile' || pathname.startsWith('/profile/')

  /** Carrito / checkout: scroll en contenedor de página. */
  const isCheckoutInnerScroll =
    pathname === '/cart' ||
    pathname === '/checkout' ||
    pathname === '/checkout/gift' ||
    pathname === '/checkout/gift-direct'

  /**
   * Feed, eventos, amigos, perfil, notificaciones, mensajes: scroll en `#…-scroll-root` dentro de la página.
   * `<main>` queda `overflow-hidden` (mismo criterio que /cart) para que Chrome Android reciba un único `overflow-y: auto` acotado.
   */
  const isAppMainInnerScroll =
    pathname === '/feed' ||
    pathname === '/events' ||
    pathname === '/friends' ||
    pathname === '/wishlist' ||
    pathname === '/notifications' ||
    pathname === '/messages' ||
    isPostDetailRoute ||
    isProductRoute ||
    isProfileRoute

  const mainLockedToPageScroll = isAppMainInnerScroll || isCheckoutInnerScroll

  return (
    <MainLayoutErrorBoundary>
      <FeedInitProvider>
        <OnboardingProvider>
          <ProfileNavigationProvider>
            <div
              className={clsx(
                'flex',
                isLandingRoute
                  ? 'min-h-screen overflow-visible'
                  : 'h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden md:h-screen md:max-h-none',
              )}
              style={{ backgroundColor: '#1E1E1E' }}
            >
              <Sidebar />
              <main
                id="app-main"
                className={clsx(
                  'relative z-0 ml-0 flex min-h-0 min-w-0 flex-1 flex-col md:ml-36 lg:ml-[208px]',
                  isLandingRoute
                    ? 'overflow-visible pb-20 md:pb-0 lg:pb-0'
                    : mainLockedToPageScroll
                    ? 'min-h-0 overflow-hidden pb-0'
                    : 'overflow-y-auto overscroll-y-contain pb-20 md:pb-0 lg:pb-0'
                )}
                style={{ backgroundColor: 'var(--color-surface-191e23-20)' }}
              >
                {children}
              </main>
              {/* Después de main para quedar por encima del contenido (scroll / stacking) en móvil */}
              <MobileBottomNav />
            </div>
            {showConsentModal && (
              <DataPolicyConsentModal isOpen={showConsentModal} />
            )}
            {/* Solo renderizar FloatingChatsManager si el usuario está autenticado */}
            {isAuthenticated && <FloatingChatsManager />}
          </ProfileNavigationProvider>
        </OnboardingProvider>
      </FeedInitProvider>
    </MainLayoutErrorBoundary>
  )
}

