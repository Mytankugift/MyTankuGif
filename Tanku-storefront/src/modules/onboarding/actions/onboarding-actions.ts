
export interface OnboardingStatusResponse {
  phase_one_completed: boolean
  phase_two_completed: boolean
  showPhaseOne: boolean
  showPhaseTwo: boolean
  phase_one_current_step: number
  phase_two_current_step: number
  incentive_popup_shown: boolean
  incentive_popup_dismissed: boolean
  has_phase_one_data: boolean
  has_phase_two_data: boolean
}

export interface SavePhaseOnePayload {
  birth_date: string
  gender: string
  marital_status: string
  country: string
  city: string
  languages: string[]
  main_interests: string[]
  representative_colors: string[]
  favorite_activities: string[]
  important_celebrations: string[]
}

export interface SavePhaseTwoPayload {
  product_interests: string[]
  favorite_social_networks: string[]
  preferred_interaction: string[]
  purchase_frequency: string
  monthly_budget: string
  brand_preference: string
  purchase_motivation: string
  social_circles: string[]
  wants_connections: string
  connection_types: string[]
  lifestyle_style: string[]
  personal_values: string[]
  platform_expectations: string[]
  preferred_content_type: string[]
  connection_moments: string[]
  shopping_days: string
  ecommerce_experience: string
  social_activity_level: string
  notifications_preference: string
}

// Get onboarding status
export const getOnboardingStatus = async (customer_id: string): Promise<OnboardingStatusResponse> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/onboarding/status?customer_id=${customer_id}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al obtener estado del onboarding")
    }

    const result = await response.json()
    return result.data
  } catch (error: any) {
    // Solo mostrar error si no es un error de red esperado
    if (error?.message && !error.message.includes('Failed to fetch')) {
      console.warn("Error al obtener estado del onboarding:", error?.message || error)
    }
    throw error
  }
}

// Save Phase One data
export const savePhaseOneData = async (
  customer_id: string,
  data: SavePhaseOnePayload
): Promise<any> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/onboarding/phase-one`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify({ customer_id, ...data }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al guardar datos de Fase 1")
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al guardar datos de Fase 1:", error)
    throw error
  }
}

// Save Phase Two data
export const savePhaseTwoData = async (
  customer_id: string,
  data: SavePhaseTwoPayload
): Promise<any> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/onboarding/phase-two`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify({ customer_id, ...data }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al guardar datos de Fase 2")
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al guardar datos de Fase 2:", error)
    throw error
  }
}

// Complete onboarding phase
export const completeOnboardingPhase = async (
  customer_id: string,
  phase: 'one' | 'two'
): Promise<any> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/onboarding/complete-phase`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify({ customer_id, phase }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al completar fase del onboarding")
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al completar fase del onboarding:", error)
    throw error
  }
}

// Handle incentive popup
export const handleIncentivePopup = async (
  customer_id: string,
  action: 'show' | 'dismiss'
): Promise<any> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/onboarding/incentive-popup`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify({ customer_id, action }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al manejar popup de incentivo")
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al manejar popup de incentivo:", error)
    throw error
  }
}
