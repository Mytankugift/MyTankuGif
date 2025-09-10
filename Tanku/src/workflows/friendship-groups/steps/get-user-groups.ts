import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export const getUserGroupsStep = createStep(
  "get-user-groups",
  async (input: { user_id: string }, { container }) => {
    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Get user's group memberships
      const memberships = await friendshipGroupsModuleService.listFriendInGroups({
        customer_id: input.user_id,
        solicitation_status: "accepted",
      })

      // Get group details for each membership
      const groupIds = memberships.map(membership => membership.group_id)
      const groups = await friendshipGroupsModuleService.listFriendshipGroups({
        id: groupIds,
      })

      // Enrich groups with membership info and member counts
      const enrichedGroups = await Promise.all(
        groups.map(async (group) => {
          const membership = memberships.find(m => m.group_id === group.id)
          
          // Get member count
          const allMembers = await friendshipGroupsModuleService.listFriendInGroups({
            group_id: group.id,
            solicitation_status: "accepted",
          })

          return {
            ...group,
            role: membership?.role || "member",
            member_count: allMembers.length,
          }
        })
      )

      return new StepResponse(enrichedGroups)
    } catch (error) {
      console.error("Error getting user groups:", error)
      throw new Error(`Failed to get user groups: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
)
