'use client'

import Sidebar from '@/components/layout/sidebar'
import { useAuthInit } from '@/lib/hooks/use-auth-init'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'
import { ProfileNavigationProvider } from '@/lib/context/profile-navigation-context'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Inicializar auth una sola vez
  useAuthInit()

  return (
    <OnboardingProvider>
      <ProfileNavigationProvider>
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1E1E1E' }}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto lg:ml-60 ml-0" style={{ backgroundColor: '#1E1E1E' }}>
            {children}
          </main>
        </div>
      </ProfileNavigationProvider>
    </OnboardingProvider>
  )
}

