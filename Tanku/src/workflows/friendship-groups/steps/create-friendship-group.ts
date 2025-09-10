import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service";

export const createFriendshipGroupStep = createStep(
  "create-friendship-group",
  async (input: {
    group_name: string
    description?: string
    image_url?: string
    created_by: string
    is_private: boolean
  }, { container }) => {
    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Create the friendship group
      const group = await friendshipGroupsModuleService.createFriendshipGroups({
        group_name: input.group_name,
        description: input.description,
        image_url: input.image_url,
        created_by: input.created_by,
        is_private: input.is_private,
      })

      // Add the creator as admin member
      await friendshipGroupsModuleService.createFriendInGroups({
        group_id: group.id,
        customer_id: input.created_by,
        role: "admin",
        solicitation_status: "accepted",
        joined_at: new Date(),
      })
      
      return new StepResponse(group, {
        group_id: group.id,
        created_by: input.created_by,
      })
    } catch (error) {
      console.error("Error creating friendship group:", error)
      throw new Error(`Failed to create friendship group: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Remove the group member entry
      const members = await friendshipGroupsModuleService.listFriendInGroups({
        group_id: compensationData.group_id,
        customer_id: compensationData.created_by,
      })

      if (members.length > 0) {
        await friendshipGroupsModuleService.deleteFriendInGroups(members[0].id)
      }

      // Delete the group
      await friendshipGroupsModuleService.deleteFriendshipGroups(compensationData.group_id)
    } catch (error) {
      console.error("Error in create friendship group compensation:", error)
    }
  }
)
