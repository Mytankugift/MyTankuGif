"use client"

import { signout } from '@lib/data/customer'
import { usePersonalInfoActions } from './use-personal-info-actions'

/**
 * Enhanced logout handler that integrates with personal info context
 */
export const useLogoutHandler = () => {
  const { onLogoutSuccess } = usePersonalInfoActions()

  const handleLogout = async (countryCode: string) => {
    try {
      console.log('🔄 Starting logout process...')
      
      // Clear personal info context first
      onLogoutSuccess()
      
      // Then perform server logout
      await signout(countryCode)
      
      console.log('✅ Logout completed successfully')
    } catch (error) {
      console.error('❌ Error during logout:', error)
      // Even if server logout fails, we should clear local context
      onLogoutSuccess()
    }
  }

  return { handleLogout }
}
