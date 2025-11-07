import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export const updateFriendshipGroupStep = createStep(
  "update-friendship-group",
  async (input: {
    group_id: string
    group_name?: string
    description?: string
    image_url?: string
    updated_by: string
  }, { container }) => {
    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Verify the group exists
      const group = await friendshipGroupsModuleService.retrieveFriendshipGroups(input.group_id)
      
      if (!group) {
        throw new Error("Grupo no encontrado")
      }

      // Check permissions: only the group creator can update the group (private classification model)
      if (group.created_by !== input.updated_by) {
        throw new Error("Solo el creador del grupo puede modificarlo")
      }

      // Prepare update data (only include fields that are provided)
      const updateData: any = {}
      if (input.group_name !== undefined) {
        updateData.group_name = input.group_name
      }
      if (input.description !== undefined) {
        updateData.description = input.description
      }
      if (input.image_url !== undefined) {
        updateData.image_url = input.image_url
      }

      // Update the group
      const updatedGroup = await friendshipGroupsModuleService.updateFriendshipGroups({
        id: input.group_id,
        ...updateData,
      })

      return new StepResponse({ 
        success: true,
        group: updatedGroup,
        message: "Grupo actualizado exitosamente"
      }, {
        group_id: input.group_id,
        original_group: group
      })
    } catch (error) {
      console.error("Error updating friendship group:", error)
      throw new Error(`Failed to update friendship group: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Restore original group data
      await friendshipGroupsModuleService.updateFriendshipGroups({
        id: compensationData.group_id,
        group_name: compensationData.original_group.group_name,
        description: compensationData.original_group.description,
        image_url: compensationData.original_group.image_url,
      })
    } catch (error) {
      console.error("Error in update friendship group compensation:", error)
    }
  }
)

