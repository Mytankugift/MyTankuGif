'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import MobileBottomNav from '@/components/layout/mobile-bottom-nav'
import { useAuthInit } from '@/lib/hooks/use-auth-init'
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

  return (
    <MainLayoutErrorBoundary>
      <FeedInitProvider>
        <OnboardingProvider>
          <ProfileNavigationProvider>
            <div
              className="flex h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden md:h-screen md:max-h-none"
              style={{ backgroundColor: '#1E1E1E' }}
            >
              <Sidebar />
              <main
                className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pb-20 md:ml-36 md:pb-0 lg:ml-60 lg:pb-0 ml-0"
                style={{ backgroundColor: '#1E1E1E' }}
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

