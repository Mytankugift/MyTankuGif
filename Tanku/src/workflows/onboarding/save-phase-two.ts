import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { savePhaseTwoStep } from "./steps/save-phase-two"

export interface SavePhaseTwoInput {
  customer_id: string
  product_interests: string[]
  favorite_social_networks: string[]
  preferred_interaction: string[]
  purchase_frequency: string
  monthly_budget: string
  brand_preference: string
  purchase_motivation: string
  social_circles: string[]
  wants_connections: string
  connection_types: string[]
  lifestyle_style: string[]
  personal_values: string[]
  platform_expectations: string[]
  preferred_content_type: string[]
  connection_moments: string[]
  shopping_days: string
  ecommerce_experience: string
  social_activity_level: string
  notifications_preference: string
}

export const savePhaseTwoWorkflow = createWorkflow(
  "save-phase-two-workflow",
  (input: SavePhaseTwoInput) => {
    const result = savePhaseTwoStep(input)
    
    return new WorkflowResponse(result)
  }
)
