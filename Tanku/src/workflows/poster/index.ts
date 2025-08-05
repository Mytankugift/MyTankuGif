import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createPosterStep, CreatePosterInput } from "./steps/create-poster"
import { getUserPostersStep, GetUserPostersInput } from "./steps/get-user-posters"

export const createPosterWorkflow = createWorkflow(
  "create-poster-workflow",
  (input: CreatePosterInput) => {
    const poster = createPosterStep(input)
    return new WorkflowResponse(poster)
  }
)

export const getUserPostersWorkflow = createWorkflow(
  "get-user-posters-workflow",
  (input: GetUserPostersInput) => {
    const result = getUserPostersStep(input)
    return new WorkflowResponse(result)
  }
)

// Export interfaces for reuse
export { CreatePosterInput } from "./steps/create-poster"
export { GetUserPostersInput } from "./steps/get-user-posters"
