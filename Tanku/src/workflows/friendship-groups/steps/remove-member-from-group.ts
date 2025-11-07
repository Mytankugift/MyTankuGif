import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export const removeMemberFromGroupStep = createStep(
  "remove-member-from-group",
  async (input: {
    group_id: string
    member_id: string
    removed_by: string
  }, { container }) => {
    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Verify the group exists
      const group = await friendshipGroupsModuleService.retrieveFriendshipGroups(input.group_id)
      
      if (!group) {
        throw new Error("Grupo no encontrado")
      }

      // Verify the member exists in the group
      const memberMembership = await friendshipGroupsModuleService.listFriendInGroups({
        id: input.member_id,
        group_id: input.group_id,
      })

      if (memberMembership.length === 0) {
        throw new Error("Miembro no encontrado en el grupo")
      }

      const member = memberMembership[0]

      // Check permissions: only the group creator can remove members (private classification model)
      // In the new model, groups are private and only the creator manages them
      if (group.created_by !== input.removed_by) {
        throw new Error("Solo el creador del grupo puede eliminar miembros")
      }

      // Delete the member from the group
      await friendshipGroupsModuleService.deleteFriendInGroups(input.member_id)

      return new StepResponse({ 
        success: true,
        message: "Miembro eliminado exitosamente del grupo"
      })
    } catch (error) {
      console.error("Error removing member from group:", error)
      throw new Error(`Failed to remove member from group: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
)

