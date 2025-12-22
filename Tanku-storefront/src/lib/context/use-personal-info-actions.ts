"use client"

import { usePersonalInfo } from './personal-info-context'
import {
  handleLoginSuccess,
  handleRegistrationSuccess,
  handleLogoutSuccess,
  handleProfileUpdate,
  refreshUserData,
} from './personal-info-actions'

export const usePersonalInfoActions = () => {
  const { refreshPersonalInfo, clearPersonalInfo } = usePersonalInfo()

  return {
    onLoginSuccess: () => handleLoginSuccess(refreshPersonalInfo),
    
    onRegistrationSuccess: () => handleRegistrationSuccess(refreshPersonalInfo),
    
    onLogoutSuccess: () => handleLogoutSuccess(clearPersonalInfo),
    
    onProfileUpdate: () => handleProfileUpdate(refreshPersonalInfo),
    
    refreshUserData: () => refreshUserData(refreshPersonalInfo),
  }
}
