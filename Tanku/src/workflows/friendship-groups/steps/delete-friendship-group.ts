import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export const deleteFriendshipGroupStep = createStep(
  "delete-friendship-group",
  async (input: {
    group_id: string
    deleted_by: string
  }, { container }) => {
    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Verify the group exists
      const group = await friendshipGroupsModuleService.retrieveFriendshipGroups(input.group_id)
      
      if (!group) {
        throw new Error("Grupo no encontrado")
      }

      // Check permissions: only the group creator can delete the group (private classification model)
      if (group.created_by !== input.deleted_by) {
        throw new Error("Solo el creador del grupo puede eliminarlo")
      }

      // Get all members of the group
      const members = await friendshipGroupsModuleService.listFriendInGroups({
        group_id: input.group_id,
      })

      // Delete all members first
      for (const member of members) {
        await friendshipGroupsModuleService.deleteFriendInGroups(member.id)
      }

      // Delete the group
      await friendshipGroupsModuleService.deleteFriendshipGroups(input.group_id)

      return new StepResponse({ 
        success: true,
        message: "Grupo eliminado exitosamente"
      }, {
        group_id: input.group_id,
        deleted_members: members.map(m => m.id)
      })
    } catch (error) {
      console.error("Error deleting friendship group:", error)
      throw new Error(`Failed to delete friendship group: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Restore the group and members (soft delete recovery would be handled by the service)
      // This is a basic compensation - in production you might want to restore from backup
      console.log("Compensation: Group deletion cannot be fully reversed without backup")
    } catch (error) {
      console.error("Error in delete friendship group compensation:", error)
    }
  }
)

