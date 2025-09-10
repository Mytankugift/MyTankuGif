import { 
  createWorkflow, 
  WorkflowResponse,
  transform,
  when
} from "@medusajs/framework/workflows-sdk"
import { createFriendshipGroupStep } from "./steps/create-friendship-group"
import { getUserGroupsStep } from "./steps/get-user-groups"
import { getGroupInvitationsStep } from "./steps/get-group-invitations"
import { respondToGroupInvitationStep } from "./steps/respond-to-group-invitation"
import { inviteToGroupStep } from "./steps/invite-to-group"
import { getGroupMembersStep } from "./steps/get-group-members"

// Create Friendship Group Workflow
export const createFriendshipGroupWorkflow = createWorkflow(
  "create-friendship-group",
  (input: {
    group_name: string
    description?: string
    image_url?: string
    created_by: string
    is_private: boolean
  }) => {
    const group = createFriendshipGroupStep(input)
    
    return new WorkflowResponse({
      group
    })
  }
)

// Get User Groups Workflow
export const getUserGroupsWorkflow = createWorkflow(
  "get-user-groups",
  (input: { user_id: string }) => {
    const groups = getUserGroupsStep(input)
    
    return new WorkflowResponse({
      groups
    })
  }
)

// Get Group Invitations Workflow
export const getGroupInvitationsWorkflow = createWorkflow(
  "get-group-invitations",
  (input: { user_id: string }) => {
    const invitations = getGroupInvitationsStep(input)
    
    return new WorkflowResponse({
      invitations
    })
  }
)

// Respond to Group Invitation Workflow
export const respondToGroupInvitationWorkflow = createWorkflow(
  "respond-to-group-invitation",
  (input: {
    invitation_id: string
    response: "accepted" | "rejected"
  }) => {
    const result = respondToGroupInvitationStep(input)
    
    return new WorkflowResponse({
      message: result.message
    })
  }
)

// Invite to Group Workflow
export const inviteToGroupWorkflow = createWorkflow(
  "invite-to-group",
  (input: {
    group_id: string
    friend_ids: string[]
    message?: string
    invited_by: string
  }) => {
    const result = inviteToGroupStep(input)
    
    return new WorkflowResponse({
      message: result.message,
      invitations_sent: result.invitations_sent
    })
  }
)

// Get Group Members Workflow
export const getGroupMembersWorkflow = createWorkflow(
  "get-group-members",
  (input: { group_id: string }) => {
    const members = getGroupMembersStep(input)
    
    return new WorkflowResponse({
      members
    })
  }
)
