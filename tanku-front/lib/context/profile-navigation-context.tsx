'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { STALKERGIFT_PATH } from '@/components/stalkergift/stalkergift-paths'

export type ProfileTab = 'PUBLICACIONES' | 'RED TANKU' | 'MIS TANKUS'

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

    // StalkerGift vive en /stalkergift (conversaciones / regalos)
    if (tabParam && window.location.pathname === '/profile') {
      const decodedTab = decodeURIComponent(tabParam).replace(/\+/g, ' ').trim()
      const stalkerUpper = decodedTab.toUpperCase()
      if (stalkerUpper.includes('STALKER') && stalkerUpper.includes('GIFT')) {
        const orderId = urlParams.get('orderId')
        const q = new URLSearchParams()
        if (orderId) {
          q.set('sgFilter', 'all')
          q.set('orderId', orderId)
        } else {
          q.set('sgFilter', 'sent')
        }
        router.replace(`${STALKERGIFT_PATH.gifts}?${q.toString()}`)
        return
      }
    }
    
    if (
      tabParam === 'MIS_COMPRAS' ||
      tabParam === 'MIS_TANKUS' ||
      savedTab === 'MIS COMPRAS' ||
      savedTab === 'MIS TANKUS'
    ) {
      setActiveTab('MIS TANKUS')
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
        'MIS_COMPRAS': 'MIS TANKUS',
        'MIS_TANKUS': 'MIS TANKUS',
        'REGALOS': 'MIS TANKUS'
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
        } else if (
          (upperDecoded.includes('MIS') && upperDecoded.includes('COMPRAS')) ||
          (upperDecoded.includes('MIS') && upperDecoded.includes('TANKUS'))
        ) {
          mappedTab = 'MIS TANKUS'
        } else if (upperDecoded === 'REGALOS') {
          mappedTab = 'MIS TANKUS'
        }
      }
      
      if (mappedTab) {
        setActiveTab(mappedTab)
        urlParams.delete('tab')
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '')
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [router])

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
