import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createPosterStep, CreatePosterInput } from "./steps/create-poster"
import { getUserPostersStep, GetUserPostersInput } from "./steps/get-user-posters"
import { getUserAndFriendsPostersStep, GetUserAndFriendsPostersInput } from "./steps/get-user-and-friends-posters"
import { togglePosterLikeStep, TogglePosterLikeInput } from "./steps/toggle-poster-like"
import { getPosterReactionsStep, GetPosterReactionsInput } from "./steps/get-poster-reactions"
import { getPosterCommentsStep, GetPosterCommentsInput } from "./steps/get-poster-comments"
import { addPosterCommentStep, AddPosterCommentInput } from "./steps/add-poster-comment"
import { editPosterCommentStep, EditPosterCommentInput } from "./steps/edit-poster-comment"
import { deletePosterCommentStep, DeletePosterCommentInput } from "./steps/delete-poster-comment"

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

export const getUserAndFriendsPostersWorkflow = createWorkflow(
  "get-user-and-friends-posters-workflow",
  (input: GetUserAndFriendsPostersInput) => {
    const result = getUserAndFriendsPostersStep(input)
    return new WorkflowResponse(result)
  }
)

export const togglePosterLikeWorkflow = createWorkflow(
  "toggle-poster-like-workflow",
  (input: TogglePosterLikeInput) => {
    const result = togglePosterLikeStep(input)
    return new WorkflowResponse(result)
  }
)

export const getPosterReactionsWorkflow = createWorkflow(
  "get-poster-reactions-workflow",
  (input: GetPosterReactionsInput) => {
    const result = getPosterReactionsStep(input)
    return new WorkflowResponse(result)
  }
)

export const getPosterCommentsWorkflow = createWorkflow(
  "get-poster-comments-workflow",
  (input: GetPosterCommentsInput) => {
    const result = getPosterCommentsStep(input)
    return new WorkflowResponse(result)
  }
)

export const addPosterCommentWorkflow = createWorkflow(
  "add-poster-comment-workflow",
  (input: AddPosterCommentInput) => {
    const result = addPosterCommentStep(input)
    return new WorkflowResponse(result)
  }
)

export const editPosterCommentWorkflow = createWorkflow(
  "edit-poster-comment-workflow",
  (input: EditPosterCommentInput) => {
    const result = editPosterCommentStep(input)
    return new WorkflowResponse(result)
  }
)

export const deletePosterCommentWorkflow = createWorkflow(
  "delete-poster-comment-workflow",
  (input: DeletePosterCommentInput) => {
    const result = deletePosterCommentStep(input)
    return new WorkflowResponse(result)
  }
)

// Export interfaces for reuse
export { CreatePosterInput } from "./steps/create-poster"
export { GetUserPostersInput } from "./steps/get-user-posters"
export { GetUserAndFriendsPostersInput } from "./steps/get-user-and-friends-posters"
export { TogglePosterLikeInput } from "./steps/toggle-poster-like"
export { GetPosterReactionsInput } from "./steps/get-poster-reactions"
export { GetPosterCommentsInput } from "./steps/get-poster-comments"
export { AddPosterCommentInput } from "./steps/add-poster-comment"
export { EditPosterCommentInput } from "./steps/edit-poster-comment"
export { DeletePosterCommentInput } from "./steps/delete-poster-comment"
