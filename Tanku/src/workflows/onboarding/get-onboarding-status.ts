import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getOnboardingStatusStep } from "./steps/get-onboarding-status"

export interface GetOnboardingStatusInput {
  customer_id: string
}

export const getOnboardingStatusWorkflow = createWorkflow(
  "get-onboarding-status-workflow",
  (input: GetOnboardingStatusInput) => {
    const statusResult = getOnboardingStatusStep(input)
    
    return new WorkflowResponse(statusResult)
  }
)
