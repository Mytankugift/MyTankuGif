import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createUserStoryStep, CreateUserStoryInput, CreateUserStoryOutput } from "./steps/create-user-story"
import { getUserStoriesStep, GetUserStoriesInput, GetUserStoriesOutput } from "./steps/get-user-stories"

export const createUserStoryWorkflow = createWorkflow(
  "create-user-story-workflow",
  (input: CreateUserStoryInput) => {
    const storyResult = createUserStoryStep(input)
    
    return new WorkflowResponse(storyResult)
  }
)

export const getUserStoriesWorkflow = createWorkflow(
  "get-user-stories-workflow",
  (input: GetUserStoriesInput) => {
    const storiesResult = getUserStoriesStep(input)
    
    return new WorkflowResponse(storiesResult)
  }
)

export { CreateUserStoryInput, CreateUserStoryOutput, GetUserStoriesInput, GetUserStoriesOutput }