"use client"

import { usePersonalInfo } from './personal-info-context'
import {
  handleLoginSuccess,
  handleRegistrationSuccess,
  handleLogoutSuccess,
  handleProfileUpdate,
  refreshUserData,
} from './personal-info-actions'

/**
 * Custom hook that provides authentication actions integrated with personal info context
 */
export const usePersonalInfoActions = () => {
  const { refreshPersonalInfo, clearPersonalInfo } = usePersonalInfo()

  return {
    // Called after successful login
    onLoginSuccess: () => handleLoginSuccess(refreshPersonalInfo),
    
    // Called after successful registration
    onRegistrationSuccess: () => handleRegistrationSuccess(refreshPersonalInfo),
    
    // Called after successful logout
    onLogoutSuccess: () => handleLogoutSuccess(clearPersonalInfo),
    
    // Called after profile updates
    onProfileUpdate: () => handleProfileUpdate(refreshPersonalInfo),
    
    // Manual refresh
    refreshUserData: () => refreshUserData(refreshPersonalInfo),
  }
}
