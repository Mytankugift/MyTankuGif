"use client"

import React from 'react'
import { RegionProvider } from './region-context'
import { StoreContextProvider } from './store-context'
import { PersonalInfoProvider } from './personal-info-context'

/**
 * Combined provider that wraps all context providers
 * This ensures proper provider hierarchy and makes setup easier
 */
interface AppContextProviderProps {
  children: React.ReactNode
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  return (
    <RegionProvider>
      <StoreContextProvider>
        <PersonalInfoProvider>
          {children}
        </PersonalInfoProvider>
      </StoreContextProvider>
    </RegionProvider>
  )
}

// Export all context-related exports for easy importing
export {
  PersonalInfoProvider,
  usePersonalInfo,
  useAuth,
  useUserProfile,
} from './personal-info-context'

export {
  usePersonalInfoActions,
} from './use-personal-info-actions'

export {
  handleLoginSuccess,
  handleRegistrationSuccess,
  handleLogoutSuccess,
  handleProfileUpdate,
  refreshUserData,
} from './personal-info-actions'

// Re-export existing context providers
export { RegionProvider, useRegion } from './region-context'
export { StoreContextProvider, useStoreTanku } from './store-context'

// Export types
export type { PersonalInfoContextType } from './personal-info-context'
