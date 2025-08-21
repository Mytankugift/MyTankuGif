import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { completeOnboardingPhaseStep } from "./steps/complete-onboarding-phase"

export interface CompleteOnboardingPhaseInput {
  customer_id: string
  phase: 'one' | 'two'
}

export const completeOnboardingPhaseWorkflow = createWorkflow(
  "complete-onboarding-phase-workflow",
  (input: CompleteOnboardingPhaseInput) => {
    const result = completeOnboardingPhaseStep(input)
    
    return new WorkflowResponse(result)
  }
)
