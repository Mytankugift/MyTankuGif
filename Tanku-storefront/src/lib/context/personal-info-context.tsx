  "use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { HttpTypes } from '@medusajs/types'
import { retrieveCustomer } from '@lib/data/customer'
import { getPersonalInfo } from '@modules/personal-info/actions/get-personal-info'

// Extended interface for personal information
interface PersonalInfo extends HttpTypes.StoreCustomer {
  avatar_url?: string
  status_message?: string
  bio?: string
  location?: string
  website?: string
  birth_date?: string
  gender?: string
  preferences?: Record<string, any>
  banner_profile_url?: string
  social_url?: any
  languages?: any
  interests?: any
  favorite_colors?: any
  favorite_activities?: any
  friends_count?: number
  pseudonym?: string
}

// Unified user data structure
export interface UserData {
  // Basic info
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  phone: string | null
  
  // Personal info
  avatarUrl: string | null
  statusMessage: string | null
  bio: string | null
  location: string | null
  website: string | null
  birthDate: string | null
  gender: string | null
  friends_count: number | null
  
  // Metadata
  preferences: Record<string, any>
  hasCompletedProfile: boolean
  
  // Raw data (for advanced usage)
  raw: PersonalInfo
}

export interface PersonalInfoContextType {
  // Core user data
  personalInfo: PersonalInfo | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null

  // Actions
  setPersonalInfo: (info: PersonalInfo | null) => void
  refreshPersonalInfo: () => Promise<void>
  clearPersonalInfo: () => void
  updateLocalPersonalInfo: (updates: Partial<PersonalInfo>) => void
  updatePseudonym?: (pseudonym: string) => Promise<{ success: boolean; error?: string }>

  // Unified user getter
  getUser: () => UserData | null
}

const PersonalInfoContext = createContext<PersonalInfoContextType | undefined>(undefined)

interface PersonalInfoProviderProps {
  children: React.ReactNode
}

export const PersonalInfoProvider: React.FC<PersonalInfoProviderProps> = ({ children }) => {
  const [personalInfo, setPersonalInfoState] = useState<PersonalInfo | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Derived state
  const isAuthenticated = personalInfo !== null

  // Set personal info with validation
  const setPersonalInfo = useCallback((info: PersonalInfo | null) => {
    setPersonalInfoState(info)
    setError(null)
  }, [])

  // Refresh personal info from server
  const refreshPersonalInfo = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const customer = await retrieveCustomer()
      
      if (customer) {
        // Get additional personal info from dedicated endpoint
        const personalInfoResult = await getPersonalInfo(customer.id)
        
        // Start with customer data extended with metadata fields
        const extendedInfo: PersonalInfo = {
          ...customer,
          avatar_url: (customer.metadata?.avatar_url as string) || undefined,
          status_message: (customer.metadata?.status_message as string) || undefined,
          bio: (customer.metadata?.bio as string) || undefined,
          location: (customer.metadata?.location as string) || undefined,
          website: (customer.metadata?.website as string) || undefined,
          birth_date: (customer.metadata?.birth_date as string) || undefined,
          gender: (customer.metadata?.gender as string) || undefined,
          preferences: customer.metadata?.preferences as Record<string, any> || {},
          friends_count: (customer.metadata?.friends_count as number) || undefined,
        }
        
        // If we have additional personal info from the dedicated endpoint, merge it
        if (personalInfoResult.success && personalInfoResult.data) {
          const personalData = personalInfoResult.data
          
          // Merge the additional personal info, giving priority to the dedicated endpoint data
          const mergedData = {
            avatar_url: personalData.avatar_url || extendedInfo.avatar_url,
            status_message: personalData.status_message || extendedInfo.status_message,
            bio: personalData.bio || extendedInfo.bio,
            location: personalData.location || extendedInfo.location,
            website: personalData.website || extendedInfo.website,
            birth_date: personalData.birthday || extendedInfo.birth_date,
            gender: personalData.marital_status || extendedInfo.gender,
            banner_profile_url: personalData.banner_profile_url,
            social_url: personalData.social_url,
            languages: personalData.languages,
            interests: personalData.interests,
            favorite_colors: personalData.favorite_colors,
            favorite_activities: personalData.favorite_activities,
            friends_count: personalData.friends_count,
            pseudonym: personalData.pseudonym,
          }
          
          Object.assign(extendedInfo, mergedData)
        }
        
        setPersonalInfo(extendedInfo)
      } else {
        setPersonalInfo(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh personal info')
      setPersonalInfo(null)
    } finally {
      setIsLoading(false)
    }
  }, [setPersonalInfo])

  // Clear personal info (for logout)
  const clearPersonalInfo = useCallback(() => {
    setPersonalInfoState(null)
    setError(null)
    setIsLoading(false)
  }, [])

  // Update local personal info without server call
  const updateLocalPersonalInfo = useCallback((updates: Partial<PersonalInfo>) => {
    setPersonalInfoState(prev => {
      if (!prev) return null
      return { ...prev, ...updates }
    })
  }, [])

  // Server updater for pseudonym
  const updatePseudonym = useCallback(async (pseudonym: string) => {
    try {
      const customer = await retrieveCustomer()
      if (!customer) return { success: false, error: 'No autenticado' }
      const { updatePseudonym: updatePseudonymAction } = await import('@modules/personal-info/actions/update-pseudonym')
      const resp = await updatePseudonymAction({ customer_id: customer.id, pseudonym })
      if (resp.success) {
        updateLocalPersonalInfo({ pseudonym })
        return { success: true }
      }
      return { success: false, error: resp.error || 'No se pudo actualizar' }
    } catch (e) {
      return { success: false, error: 'Error de conexión' }
    }
  }, [updateLocalPersonalInfo])

  // Unified user getter - contains all user data in organized structure
  const getUser = useCallback(() => {
    if (!personalInfo) return null
    
    const { first_name, last_name, email, phone } = personalInfo
    const fullName = first_name && last_name 
      ? `${first_name} ${last_name}` 
      : first_name || last_name || null
    
    const hasCompletedProfile = !!(first_name && last_name && email && phone)
    
    return {
      // Basic info
      id: personalInfo.id,
      email: personalInfo.email,
      firstName: personalInfo.first_name,
      lastName: personalInfo.last_name,
      fullName,
      phone: personalInfo.phone || null,
      
      // Personal info
      avatarUrl: personalInfo.avatar_url || null,
      statusMessage: personalInfo.status_message || null,
      bio: personalInfo.bio || null,
      location: personalInfo.location || null,
      website: personalInfo.website || null,
      birthDate: personalInfo.birth_date || null,
      gender: personalInfo.gender || null,
      friends_count: personalInfo.friends_count || null,
      // Metadata
      preferences: personalInfo.preferences || {},
      hasCompletedProfile,
      
      // Raw data (for advanced usage)
      raw: personalInfo
    }
  }, [personalInfo])

  // Load personal info on mount
  useEffect(() => {
    refreshPersonalInfo()
  }, [refreshPersonalInfo])

  const contextValue: PersonalInfoContextType = {
    // Core data
    personalInfo,
    isLoading,
    isAuthenticated,
    error,

    // Actions
    setPersonalInfo,
    refreshPersonalInfo,
    clearPersonalInfo,
    updateLocalPersonalInfo,
    updatePseudonym,

    // Unified user getter
    getUser,
  }

  return (
    <PersonalInfoContext.Provider value={contextValue}>
      {children}
    </PersonalInfoContext.Provider>
  )
}

// Main hook for accessing personal info context
export const usePersonalInfo = (): PersonalInfoContextType => {
  const context = useContext(PersonalInfoContext)
  if (context === undefined) {
    throw new Error('usePersonalInfo must be used within a PersonalInfoProvider')
  }
  return context
}

// Specialized hooks for common use cases
export const useAuth = () => {
  const { isAuthenticated, isLoading, personalInfo } = usePersonalInfo()
  return { isAuthenticated, isLoading, user: personalInfo }
}

export const useUserProfile = () => {
  const { 
    personalInfo, 
    isLoading,
    getUser
  } = usePersonalInfo()
  
  const user = getUser()
  
  return {
    user: personalInfo,
    isLoading,
    fullName: user?.fullName || null,
    avatarUrl: user?.avatarUrl || null,
    statusMessage: user?.statusMessage || null,
    hasCompletedProfile: user?.hasCompletedProfile || false,
    // Expose the complete user data for easier access
    userData: user,
  }
}

export default PersonalInfoContext
