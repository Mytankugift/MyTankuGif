import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ONBOARDING_MODULE } from "../../../modules/onboarding"
import OnboardingModuleService from "../../../modules/onboarding/service"

export interface GetOnboardingStatusInput {
  customer_id: string
}

export const getOnboardingStatusStep = createStep(
  "get-onboarding-status-step",
  async (data: GetOnboardingStatusInput, { container }) => {
    
    
    const onboardingService = container.resolve(
      ONBOARDING_MODULE
    )

 
      const existingStatus = await onboardingService.listOnboardingStatuses({
        customer_id: data.customer_id
      })
     

      let status
      if (existingStatus && existingStatus.length > 0) {
        status = existingStatus[0]
      } else {
        // Crear status inicial si no existe
        status = await onboardingService.createOnboardingStatuses({
          customer_id: data.customer_id,
          phase_one_completed: false,
          phase_two_completed: false,
          phase_one_current_step: 1,
          phase_two_current_step: 1,
          incentive_popup_shown: false,
          incentive_popup_dismissed: false
        })
      }

      // Verificar si existen datos de las fases
      const phaseOneData = await onboardingService.listOnboardingPhaseOnes({
        customer_id: data.customer_id
      })

      const phaseTwoData = await onboardingService.listOnboardingPhaseTwos({
        customer_id: data.customer_id
      })

      const result = {
        phase_one_completed: status.phase_one_completed,
        phase_two_completed: status.phase_two_completed,
        showPhaseOne: !status.phase_one_completed,
        showPhaseTwo: status.phase_one_completed && !status.phase_two_completed,
        phase_one_current_step: status.phase_one_current_step,
        phase_two_current_step: status.phase_two_current_step,
        incentive_popup_shown: status.incentive_popup_shown,
        incentive_popup_dismissed: status.incentive_popup_dismissed,
        has_phase_one_data: phaseOneData && phaseOneData.length > 0,
        has_phase_two_data: phaseTwoData && phaseTwoData.length > 0
      }

     
      return new StepResponse(result, result)
    
  },
  async (result, { container }) => {
    
  }
)
