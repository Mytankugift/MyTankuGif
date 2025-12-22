"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

type ProfileTab = 'PUBLICACIONES' | 'MY TANKU' | 'MIS COMPRAS' | 'STALKER GIFTS'

interface ProfileNavigationContextType {
  activeTab: ProfileTab
  setActiveTab: (tab: ProfileTab) => void
  navigateToTab: (tab: ProfileTab) => void
}

const ProfileNavigationContext = createContext<ProfileNavigationContextType | undefined>(undefined)

interface ProfileNavigationProviderProps {
  children: ReactNode
}

export function ProfileNavigationProvider({ children }: ProfileNavigationProviderProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('PUBLICACIONES')

  const navigateToTab = (tab: ProfileTab) => {
    setActiveTab(tab)
  }

  return (
    <ProfileNavigationContext.Provider value={{
      activeTab,
      setActiveTab,
      navigateToTab
    }}>
      {children}
    </ProfileNavigationContext.Provider>
  )
}

export function useProfileNavigation() {
  const context = useContext(ProfileNavigationContext)
  if (context === undefined) {
    throw new Error('useProfileNavigation must be used within a ProfileNavigationProvider')
  }
  return context
}