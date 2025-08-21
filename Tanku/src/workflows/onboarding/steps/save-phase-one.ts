import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ONBOARDING_MODULE } from "../../../modules/onboarding"
import OnboardingModuleService from "../../../modules/onboarding/service"

export interface SavePhaseOneInput {
  customer_id: string
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

export const savePhaseOneStep = createStep(
  "save-phase-one-step",
  async (data: SavePhaseOneInput, { container }) => {
    console.log("Saving phase one data for customer:", data.customer_id)
    
    const onboardingService: OnboardingModuleService = container.resolve(
      ONBOARDING_MODULE
    )

    try {
      // Verificar si ya existe información de fase 1 para este customer
      const existingPhaseOne = await onboardingService.listOnboardingPhaseOnes({
        customer_id: data.customer_id
      })

      let result

      if (existingPhaseOne && existingPhaseOne.length > 0) {
        // Actualizar información existente
        console.log("Updating existing phase one data")
        
        const updateData = {
          id: existingPhaseOne[0].id,
          birth_date: new Date(data.birth_date),
          gender: data.gender,
          marital_status: data.marital_status,
          country: data.country,
          city: data.city,
          languages: data.languages as any,
          main_interests: data.main_interests as any,
          representative_colors: data.representative_colors as any,
          favorite_activities: data.favorite_activities as any,
          important_celebrations: data.important_celebrations as any
        }
        
        result = await onboardingService.updateOnboardingPhaseOnes(updateData)
      } else {
        // Crear nueva información de fase 1
        console.log("Creating new phase one data")
        const createData = {
          customer_id: data.customer_id,
          birth_date: new Date(data.birth_date),
          gender: data.gender,
          marital_status: data.marital_status,
          country: data.country,
          city: data.city,
          languages: data.languages as any,
          main_interests: data.main_interests as any,
          representative_colors: data.representative_colors as any,
          favorite_activities: data.favorite_activities as any,
          important_celebrations: data.important_celebrations as any
        }
        
        result = await onboardingService.createOnboardingPhaseOnes(createData)
      }

      console.log("Phase one data saved successfully:", result)
      return new StepResponse(result, result)
    } catch (error) {
      console.error("Error saving phase one data:", error)
      throw error
    }
  },
  async (result, { container }) => {
    console.log("Compensating save phase one")
  }
)
