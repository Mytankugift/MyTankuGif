import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export const getUserGroupsStep = createStep(
  "get-user-groups",
  async (input: { user_id: string }, { container }) => {
    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Get groups created by the user (private classification model)
      // In the new model, users only see groups they created
      const groups = await friendshipGroupsModuleService.listFriendshipGroups({
        created_by: input.user_id,
      })

      // Enrich groups with membership info and member counts
      const enrichedGroups = await Promise.all(
        groups.map(async (group) => {
          // Get user's membership in this group (should exist as creator)
          const memberships = await friendshipGroupsModuleService.listFriendInGroups({
            group_id: group.id,
            customer_id: input.user_id,
          })
          const membership = memberships[0]
          
          // Get member count (all contacts in the group)
          const allMembers = await friendshipGroupsModuleService.listFriendInGroups({
            group_id: group.id,
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
