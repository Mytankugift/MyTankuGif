import { 
  createWorkflow, 
  WorkflowResponse,
  transform,
  when
} from "@medusajs/framework/workflows-sdk"
import { createFriendshipGroupStep } from "./steps/create-friendship-group"
import { getUserGroupsStep } from "./steps/get-user-groups"
// Workflows de invitaciones mantenidos para uso futuro (ver DOCUMENTACION_INVITACIONES_FUTURO.md)
// import { getGroupInvitationsStep } from "./steps/get-group-invitations"
// import { respondToGroupInvitationStep } from "./steps/respond-to-group-invitation"
import { addFriendshipToGroupStep } from "./steps/add-friendship-to-group"
import { getGroupMembersStep } from "./steps/get-group-members"
import { removeMemberFromGroupStep } from "./steps/remove-member-from-group"
import { deleteFriendshipGroupStep } from "./steps/delete-friendship-group"
import { updateFriendshipGroupStep } from "./steps/update-friendship-group"

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
// Mantenido para uso futuro - ver DOCUMENTACION_INVITACIONES_FUTURO.md
// export const getGroupInvitationsWorkflow = createWorkflow(
//   "get-group-invitations",
//   (input: { user_id: string }) => {
//     const invitations = getGroupInvitationsStep(input)
//     
//     return new WorkflowResponse({
//       invitations
//     })
//   }
// )

// Respond to Group Invitation Workflow
// Mantenido para uso futuro - ver DOCUMENTACION_INVITACIONES_FUTURO.md
// export const respondToGroupInvitationWorkflow = createWorkflow(
//   "respond-to-group-invitation",
//   (input: {
//     invitation_id: string
//     response: "accepted" | "rejected"
//   }) => {
//     const result = respondToGroupInvitationStep(input)
//     
//     return new WorkflowResponse({
//       message: result.message
//     })
//   }
// )

// Add Friendship to Group Workflow (private classification model)
export const addFriendshipToGroupWorkflow = createWorkflow(
  "add-friendship-to-group",
  (input: {
    group_id: string
    friend_ids: string[]
    added_by: string
  }) => {
    const result = addFriendshipToGroupStep(input)
    
    return new WorkflowResponse({
      message: result.message,
      contacts_added: result.contacts_added
    })
  }
)

// Legacy: Keep old workflow names for backward compatibility (will be removed)
export const addContactToGroupWorkflow = addFriendshipToGroupWorkflow
export const inviteToGroupWorkflow = addFriendshipToGroupWorkflow

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

// Remove Member from Group Workflow
export const removeMemberFromGroupWorkflow = createWorkflow(
  "remove-member-from-group",
  (input: {
    group_id: string
    member_id: string
    removed_by: string
  }) => {
    const result = removeMemberFromGroupStep(input)
    
    return new WorkflowResponse({
      success: result.success,
      message: result.message
    })
  }
)

// Delete Friendship Group Workflow
export const deleteFriendshipGroupWorkflow = createWorkflow(
  "delete-friendship-group",
  (input: {
    group_id: string
    deleted_by: string
  }) => {
    const result = deleteFriendshipGroupStep(input)
    
    return new WorkflowResponse({
      success: result.success,
      message: result.message
    })
  }
)

// Update Friendship Group Workflow
export const updateFriendshipGroupWorkflow = createWorkflow(
  "update-friendship-group",
  (input: {
    group_id: string
    group_name?: string
    description?: string
    image_url?: string
    updated_by: string
  }) => {
    const result = updateFriendshipGroupStep(input)
    
    return new WorkflowResponse({
      success: result.success,
      group: result.group,
      message: result.message
    })
  }
)
