import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ONBOARDING_MODULE } from "../../../modules/onboarding"
import OnboardingModuleService from "../../../modules/onboarding/service"

export interface GetOnboardingStatusInput {
  customer_id: string
}

export const getOnboardingStatusStep = createStep(
  "get-onboarding-status-step",
  async (data: GetOnboardingStatusInput, { container }) => {
    
    
    const onboardingService: OnboardingModuleService = container.resolve(
      ONBOARDING_MODULE
    )

      try {
        // @ts-ignore
        const existingStatus = await onboardingService.listOnboardingStatuses({
          customer_id: data.customer_id
        })

        let status
        if (existingStatus && existingStatus.length > 0) {
          status = existingStatus[0]
        } else {
          // Crear status inicial si no existe
          // @ts-ignore
          status = await onboardingService.createOnboardingStatuses({
            customer_id: data.customer_id,
            phase_one_completed: false,
            phase_two_completed: false,
            phase_one_completed_at: null,
            phase_two_completed_at: null,
            incentive_popup_shown: false,
            incentive_popup_dismissed: false,
            incentive_popup_last_shown: null,
            phase_one_current_step: 1,
            phase_two_current_step: 1
          })
        }

        // Obtener datos de las fases para determinar si existen
        // @ts-ignore
        const phaseOneData = await onboardingService.listOnboardingPhaseOnes({
          customer_id: data.customer_id
        })

        // @ts-ignore
        const phaseTwoData = await onboardingService.listOnboardingPhaseTwos({
          customer_id: data.customer_id
        })

        const result = {
          ...status,
          showPhaseOne: !status.phase_one_completed,
          showPhaseTwo: status.phase_one_completed && !status.phase_two_completed,
          has_phase_one_data: phaseOneData && phaseOneData.length > 0,
          has_phase_two_data: phaseTwoData && phaseTwoData.length > 0
        }

        return new StepResponse(result, result)
      } catch (error) {
        console.error("Error in get onboarding status:", error)
        throw error
      }
  },
  async (result, { container }) => {
    
  }
)
