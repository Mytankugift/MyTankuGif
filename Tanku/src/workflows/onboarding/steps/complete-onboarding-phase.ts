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
    console.log(`Completing phase ${data.phase} for customer:`, data.customer_id)
    
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
        console.log("Updating existing onboarding status")
        
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
        
        result = await onboardingService.updateOnboardingStatus(updateData)
      } else {
        // Crear nuevo status
        console.log("Creating new onboarding status")
        const createData = {
          customer_id: data.customer_id,
          phase_one_completed: data.phase === 'one',
          phase_two_completed: data.phase === 'two',
          phase_one_current_step: 1,
          phase_two_current_step: 1,
          incentive_popup_shown: false,
          incentive_popup_dismissed: false
        }
        
        result = await onboardingService.createOnboardingStatus(createData)
      }

      console.log(`Phase ${data.phase} completed successfully:`, result)
      return new StepResponse(result, result)
    } catch (error) {
      console.error(`Error completing phase ${data.phase}:`, error)
      throw error
    }
  },
  async (result, { container }) => {
    console.log("Compensating complete onboarding phase")
  }
)
