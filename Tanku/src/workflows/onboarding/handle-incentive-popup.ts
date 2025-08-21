import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { handleIncentivePopupStep } from "./steps/handle-incentive-popup"

export interface HandleIncentivePopupInput {
  customer_id: string
  action: 'show' | 'dismiss'
}

export const handleIncentivePopupWorkflow = createWorkflow(
  "handle-incentive-popup-workflow",
  (input: HandleIncentivePopupInput) => {
    const result = handleIncentivePopupStep(input)
    
    return new WorkflowResponse(result)
  }
)
