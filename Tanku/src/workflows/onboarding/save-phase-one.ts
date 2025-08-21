import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { savePhaseOneStep } from "./steps/save-phase-one"

export interface SavePhaseOneInput {
  customer_id: string
  birth_date: string
  gender: string
  marital_status: string
  country: string
  city: string
  languages: string[]
  main_interests: string[]
  representative_colors: string[]
  favorite_activities: string[]
  important_celebrations: string[]
}

export const savePhaseOneWorkflow = createWorkflow(
  "save-phase-one-workflow",
  (input: SavePhaseOneInput) => {
    const result = savePhaseOneStep(input)
    
    return new WorkflowResponse(result)
  }
)
