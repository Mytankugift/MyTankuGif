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

      // Check if the user removing has permission (must be admin or group creator)
      const removerMembership = await friendshipGroupsModuleService.listFriendInGroups({
        group_id: input.group_id,
        customer_id: input.removed_by,
        solicitation_status: "accepted",
      })

      if (removerMembership.length === 0) {
        throw new Error("No tienes permisos para eliminar miembros de este grupo")
      }

      const remover = removerMembership[0]

      // Check permissions: must be admin or group creator
      if (remover.role !== "admin" && group.created_by !== input.removed_by) {
        throw new Error("Solo los administradores pueden eliminar miembros del grupo")
      }

      // Prevent removing yourself if you're the only admin
      if (member.customer_id === input.removed_by && member.role === "admin") {
        // Check if there are other admins
        const allAdmins = await friendshipGroupsModuleService.listFriendInGroups({
          group_id: input.group_id,
          role: "admin",
          solicitation_status: "accepted",
        })

        if (allAdmins.length === 1) {
          throw new Error("No puedes eliminarte a ti mismo si eres el único administrador del grupo")
        }
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

