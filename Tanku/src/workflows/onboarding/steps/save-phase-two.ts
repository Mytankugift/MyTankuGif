import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ONBOARDING_MODULE } from "../../../modules/onboarding"
import OnboardingModuleService from "../../../modules/onboarding/service"

export interface SavePhaseTwoInput {
  customer_id: string
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

export const savePhaseTwoStep = createStep(
  "save-phase-two-step",
  async (data: SavePhaseTwoInput, { container }) => {
    
    
    const onboardingService = container.resolve(
      ONBOARDING_MODULE
    )

   
      const existingPhaseTwo = await onboardingService.listOnboardingPhaseTwos({
        customer_id: data.customer_id
      })

      let result

      if (existingPhaseTwo && existingPhaseTwo.length > 0) {
        // Actualizar información existente
      
        
        const updateData = {
          id: existingPhaseTwo[0].id,
          product_interests: data.product_interests as any,
          favorite_social_networks: data.favorite_social_networks as any,
          preferred_interaction: data.preferred_interaction as any,
          purchase_frequency: data.purchase_frequency,
          monthly_budget: data.monthly_budget,
          brand_preference: data.brand_preference,
          purchase_motivation: data.purchase_motivation,
          social_circles: data.social_circles as any,
          wants_connections: data.wants_connections,
          connection_types: data.connection_types as any,
          lifestyle_style: data.lifestyle_style as any,
          personal_values: data.personal_values as any,
          platform_expectations: data.platform_expectations as any,
          preferred_content_type: data.preferred_content_type as any,
          connection_moments: data.connection_moments as any,
          shopping_days: data.shopping_days,
          ecommerce_experience: data.ecommerce_experience,
          social_activity_level: data.social_activity_level,
          notifications_preference: data.notifications_preference,
          completed_at: existingPhaseTwo[0].completed_at || new Date('1900-01-01')
        }
        
        result = await onboardingService.updateOnboardingPhaseTwos(updateData)
      } else {
        // Crear nueva información de fase 2
        
        const createData = {
          customer_id: data.customer_id,
          product_interests: data.product_interests as any,
          favorite_social_networks: data.favorite_social_networks as any,
          preferred_interaction: data.preferred_interaction as any,
          purchase_frequency: data.purchase_frequency,
          monthly_budget: data.monthly_budget,
          brand_preference: data.brand_preference,
          purchase_motivation: data.purchase_motivation,
          social_circles: data.social_circles as any,
          wants_connections: data.wants_connections,
          connection_types: data.connection_types as any,
          lifestyle_style: data.lifestyle_style as any,
          personal_values: data.personal_values as any,
          platform_expectations: data.platform_expectations as any,
          preferred_content_type: data.preferred_content_type as any,
          connection_moments: data.connection_moments as any,
          shopping_days: data.shopping_days,
          ecommerce_experience: data.ecommerce_experience,
          social_activity_level: data.social_activity_level,
          notifications_preference: data.notifications_preference,
          completed_at: new Date('1900-01-01')
        }
        
        result = await onboardingService.createOnboardingPhaseTwos(createData)
      }

    
      return new StepResponse(result, result)
    
  },
  async (result, { container }) => {
  
  }
)
