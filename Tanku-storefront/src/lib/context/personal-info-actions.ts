"use client"

import { retrieveCustomer } from '@lib/data/customer'
import { PersonalInfoContextType } from './personal-info-context'

/**
 * Client-side utilities for integrating personal info context with authentication flows
 */

// Handle successful login - refresh personal info
export const handleLoginSuccess = async (
  refreshPersonalInfo: PersonalInfoContextType['refreshPersonalInfo']
) => {
  try {
    console.log('🔄 Refreshing personal info after login...')
    await refreshPersonalInfo()
    console.log('✅ Personal info refreshed after login')
  } catch (error) {
    console.error('❌ Error refreshing personal info after login:', error)
  }
}

// Handle successful registration - refresh personal info
export const handleRegistrationSuccess = async (
  refreshPersonalInfo: PersonalInfoContextType['refreshPersonalInfo']
) => {
  try {
    console.log('🔄 Refreshing personal info after registration...')
    await refreshPersonalInfo()
    console.log('✅ Personal info refreshed after registration')
  } catch (error) {
    console.error('❌ Error refreshing personal info after registration:', error)
  }
}

// Handle successful logout - clear personal info
export const handleLogoutSuccess = (
  clearPersonalInfo: PersonalInfoContextType['clearPersonalInfo']
) => {
  try {
    console.log('🔄 Clearing personal info after logout...')
    clearPersonalInfo()
    console.log('✅ Personal info cleared after logout')
  } catch (error) {
    console.error('❌ Error clearing personal info after logout:', error)
  }
}

// Handle profile update - refresh personal info
export const handleProfileUpdate = async (
  refreshPersonalInfo: PersonalInfoContextType['refreshPersonalInfo']
) => {
  try {
    console.log('🔄 Refreshing personal info after profile update...')
    await refreshPersonalInfo()
    console.log('✅ Personal info refreshed after profile update')
  } catch (error) {
    console.error('❌ Error refreshing personal info after profile update:', error)
  }
}

// Manual refresh from server
export const refreshUserData = async (
  refreshPersonalInfo: PersonalInfoContextType['refreshPersonalInfo']
) => {
  try {
    console.log('🔄 Manually refreshing personal info...')
    await refreshPersonalInfo()
    console.log('✅ Personal info manually refreshed')
  } catch (error) {
    console.error('❌ Error manually refreshing personal info:', error)
  }
}
