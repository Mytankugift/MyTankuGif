import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service";
import { Modules } from "@medusajs/framework/utils"

export const getGroupInvitationsStep = createStep(
  "get-group-invitations",
  async (input: { user_id: string }, { container }) => {
    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    try {
      // Get pending invitations for the user
      const invitations = await friendshipGroupsModuleService.listFriendInGroups({
        customer_id: input.user_id,
        solicitation_status: "pending",
      })

      // Enrich invitations with group and sender information
      const enrichedInvitations = await Promise.all(
        invitations.map(async (invitation) => {
          // Get group details
          const group = await friendshipGroupsModuleService.retrieveFriendshipGroups(invitation.group_id)
          
          // Get sender details (group creator or admin who sent the invitation)
          // For now, we'll use the group creator as sender
          // TODO: Add invited_by field to track who sent the invitation
          const sender = await customerModuleService.retrieveCustomer(group.created_by)

          return {
            id: invitation.id,
            group_id: invitation.group_id,
            group_name: group.group_name,
            sender_id: group.created_by,
            sender_name: sender ? `${sender.first_name} ${sender.last_name}` : 'Usuario',
            message: '', // TODO: Add message field to invitations
            created_at: invitation.joined_at, // Using joined_at as invitation date
          }
        })
      )

      return new StepResponse(enrichedInvitations)
    } catch (error) {
      console.error("Error getting group invitations:", error)
      throw new Error(`Failed to get group invitations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
)
