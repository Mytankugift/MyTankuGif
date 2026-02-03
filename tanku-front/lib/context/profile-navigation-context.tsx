'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export type ProfileTab = 'PUBLICACIONES' | 'RED TANKU' | 'MIS COMPRAS' | 'STALKER GIFTS' | 'REGALOS'

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
  const router = useRouter()

  // Sincronizar con query params y localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    const savedTab = localStorage.getItem('tanku_profile_tab')
    
    if (tabParam === 'MIS_COMPRAS' || savedTab === 'MIS COMPRAS') {
      setActiveTab('MIS COMPRAS')
      localStorage.removeItem('tanku_profile_tab')
      // Limpiar query param sin recargar
      if (tabParam) {
        urlParams.delete('tab')
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '')
        window.history.replaceState({}, '', newUrl)
      }
    } else if (tabParam) {
      // Decodificar el parámetro (puede venir como "Red+Tanku" o "Red%20Tanku")
      const decodedTab = decodeURIComponent(tabParam).replace(/\+/g, ' ').trim()
      const tabMap: Record<string, ProfileTab> = {
        'PUBLICACIONES': 'PUBLICACIONES',
        'MY_TANKU': 'RED TANKU',
        'RED_TANKU': 'RED TANKU',
        'RED TANKU': 'RED TANKU',
        'MIS_COMPRAS': 'MIS COMPRAS',
        'STALKER_GIFTS': 'STALKER GIFTS',
        'REGALOS': 'REGALOS'
      }
      // Intentar mapear con el valor decodificado primero, luego con el original
      let mappedTab = tabMap[decodedTab.toUpperCase()] || tabMap[tabParam.toUpperCase()]
      
      // Si no se encuentra en el mapa, intentar comparación directa (case-insensitive)
      if (!mappedTab) {
        const upperDecoded = decodedTab.toUpperCase()
        if (upperDecoded.includes('RED') && upperDecoded.includes('TANKU')) {
          mappedTab = 'RED TANKU'
        } else if (upperDecoded === 'PUBLICACIONES') {
          mappedTab = 'PUBLICACIONES'
        } else if (upperDecoded.includes('MIS') && upperDecoded.includes('COMPRAS')) {
          mappedTab = 'MIS COMPRAS'
        } else if (upperDecoded.includes('STALKER') && upperDecoded.includes('GIFTS')) {
          mappedTab = 'STALKER GIFTS'
        } else if (upperDecoded === 'REGALOS') {
          mappedTab = 'REGALOS'
        }
      }
      
      if (mappedTab) {
        setActiveTab(mappedTab)
        urlParams.delete('tab')
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '')
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

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
