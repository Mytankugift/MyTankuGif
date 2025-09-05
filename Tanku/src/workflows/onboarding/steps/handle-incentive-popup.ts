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
   
    
    const onboardingService = container.resolve(
      ONBOARDING_MODULE
    )

    
      const existingStatus = await onboardingService.listOnboardingStatuses({
        customer_id: data.customer_id
      })

      let result

      if (existingStatus && existingStatus.length > 0) {
        // Actualizar status existente
      
        
        const updateData: any = {
          id: existingStatus[0].id
        }

        if (data.action === 'show') {
          updateData.incentive_popup_shown = true
        } else if (data.action === 'dismiss') {
          updateData.incentive_popup_dismissed = true
        }
        
        result = await onboardingService.updateOnboardingStatuses(updateData)
      } else {
        // Crear nuevo status si no existe
       
        const createData = {
          customer_id: data.customer_id,
          phase_one_completed: false,
          phase_two_completed: false,
          phase_one_current_step: 1,
          phase_two_current_step: 1,
          incentive_popup_shown: data.action === 'show',
          incentive_popup_dismissed: data.action === 'dismiss'
        }
        
        result = await onboardingService.createOnboardingStatuses(createData)
      }

     
      return new StepResponse(result, result)
    
  },
  async (result, { container }) => {
    
  }
)
