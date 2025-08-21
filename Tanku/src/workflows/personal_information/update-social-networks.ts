import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { updateSocialNetworksStep } from "./steps/update-social-networks"

export interface UpdateSocialNetworksWorkflowInput {
  customer_id: string
  social_networks: {
    facebook?: string
    instagram?: string
    youtube?: string
    tiktok?: string
    public_alias?: string
  }
}

export const updateSocialNetworksWorkflow = createWorkflow(
  "update-social-networks",
  (input: UpdateSocialNetworksWorkflowInput) => {
    const result = updateSocialNetworksStep(input)
    
    return new WorkflowResponse(result)
  }
)
