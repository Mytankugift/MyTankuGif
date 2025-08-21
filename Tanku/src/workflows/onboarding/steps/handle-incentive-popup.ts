import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ONBOARDING_MODULE } from "../../../modules/onboarding"
import OnboardingModuleService from "../../../modules/onboarding/service"

export interface HandleIncentivePopupInput {
  customer_id: string
  action: 'show' | 'dismiss'
}

export const handleIncentivePopupStep = createStep(
  "handle-incentive-popup-step",
  async (data: HandleIncentivePopupInput, { container }) => {
    console.log(`Handling incentive popup ${data.action} for customer:`, data.customer_id)
    
    const onboardingService: OnboardingModuleService = container.resolve(
      ONBOARDING_MODULE
    )

    try {
      // Verificar si existe el status del onboarding
      const existingStatus = await onboardingService.listOnboardingStatus({
        customer_id: data.customer_id
      })

      let result

      if (existingStatus && existingStatus.length > 0) {
        // Actualizar status existente
        console.log("Updating existing onboarding status for incentive popup")
        
        const updateData: any = {
          id: existingStatus[0].id
        }

        if (data.action === 'show') {
          updateData.incentive_popup_shown = true
        } else if (data.action === 'dismiss') {
          updateData.incentive_popup_dismissed = true
        }
        
        result = await onboardingService.updateOnboardingStatus(updateData)
      } else {
        // Crear nuevo status si no existe
        console.log("Creating new onboarding status for incentive popup")
        const createData = {
          customer_id: data.customer_id,
          phase_one_completed: false,
          phase_two_completed: false,
          phase_one_current_step: 1,
          phase_two_current_step: 1,
          incentive_popup_shown: data.action === 'show',
          incentive_popup_dismissed: data.action === 'dismiss'
        }
        
        result = await onboardingService.createOnboardingStatus(createData)
      }

      console.log(`Incentive popup ${data.action} handled successfully:`, result)
      return new StepResponse(result, result)
    } catch (error) {
      console.error(`Error handling incentive popup ${data.action}:`, error)
      throw error
    }
  },
  async (result, { container }) => {
    console.log("Compensating handle incentive popup")
  }
)
