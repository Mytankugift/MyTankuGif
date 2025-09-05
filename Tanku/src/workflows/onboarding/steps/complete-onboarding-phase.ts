import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ONBOARDING_MODULE } from "../../../modules/onboarding"
import OnboardingModuleService from "../../../modules/onboarding/service"

export interface CompleteOnboardingPhaseInput {
  customer_id: string
  phase: 'one' | 'two'
}

export const completeOnboardingPhaseStep = createStep(
  "complete-onboarding-phase-step",
  async (data: CompleteOnboardingPhaseInput, { container }) => {
  
    
    const onboardingService: OnboardingModuleService = container.resolve(
      ONBOARDING_MODULE
    )

      // @ts-ignore
      const existingStatus = await onboardingService.listOnboardingStatuses({
        customer_id: data.customer_id
      })

      let result

      if (existingStatus && existingStatus.length > 0) {
        // Actualizar status existente
       
        
        const updateData: any = {
          id: existingStatus[0].id
        }

        if (data.phase === 'one') {
          updateData.phase_one_completed = true
          updateData.phase_one_current_step = 1 // Reset para fase 2
        } else if (data.phase === 'two') {
          updateData.phase_two_completed = true
          updateData.phase_two_current_step = 1 // Completado
        }
        // @ts-ignore
        result = await onboardingService.updateOnboardingStatuses(updateData)
      } else {
        // Crear nuevo status
      
        const createData = {
          customer_id: data.customer_id,
          phase_one_completed: data.phase === 'one',
          phase_two_completed: data.phase === 'two',
          phase_one_current_step: 1,
          phase_two_current_step: 1,
          incentive_popup_shown: false,
          incentive_popup_dismissed: false
        }
        // @ts-ignore
        result = await onboardingService.createOnboardingStatuses(createData)
      }

     
      return new StepResponse(result, result)
  },
  async (result, { container }) => {
  
  }
)
