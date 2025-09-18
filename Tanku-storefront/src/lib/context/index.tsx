"use client"

import React from 'react'
import { RegionProvider } from './region-context'
import { StoreContextProvider } from './store-context'
import { PersonalInfoProvider } from './personal-info-context'
import { StalkerGiftProvider } from './stalker-gift-context'

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
          <StalkerGiftProvider>
            {children}
          </StalkerGiftProvider>
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

// Export StalkerGift context
export { 
  StalkerGiftProvider, 
  useStalkerGift,
  getContactMethodLabel,
  getContactMethodIcon,
  getContactMethodPlaceholder
} from './stalker-gift-context'

// Export types
export type { PersonalInfoContextType } from './personal-info-context'
export type { 
  ContactMethod, 
  RecipientData, 
  StalkerGiftData,
  Product
} from './stalker-gift-context'
