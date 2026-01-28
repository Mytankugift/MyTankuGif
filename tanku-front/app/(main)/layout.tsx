'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import { useAuthInit } from '@/lib/hooks/use-auth-init'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'
import { ProfileNavigationProvider } from '@/lib/context/profile-navigation-context'
import { DataPolicyConsentModal } from '@/components/auth/data-policy-consent-modal'
import { FloatingChatsManager } from '@/components/chat/floating-chats-manager'
import { useAuthStore } from '@/lib/stores/auth-store'

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
    <OnboardingProvider>
      <ProfileNavigationProvider>
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1E1E1E' }}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto lg:ml-60 ml-0" style={{ backgroundColor: '#1E1E1E' }}>
            {children}
          </main>
        </div>
        {showConsentModal && (
          <DataPolicyConsentModal isOpen={showConsentModal} />
        )}
        <FloatingChatsManager />
      </ProfileNavigationProvider>
    </OnboardingProvider>
  )
}

