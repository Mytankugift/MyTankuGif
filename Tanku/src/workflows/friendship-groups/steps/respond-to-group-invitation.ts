// import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
// import { FRIENDSHIP_GROUPS_MODULE } from "../../../modules/social"

// export const respondToGroupInvitationStep = createStep(
//   "respond-to-group-invitation",
//   async (input: {
//     invitation_id: string
//     response: "accepted" | "rejected"
//   }, { container }) => {
//     const friendshipGroupsModuleService = container.resolve(FRIENDSHIP_GROUPS_MODULE)

//     try {
//       // Get the invitation details
//       const invitation = await friendshipGroupsModuleService.retrieveFriendInGroup(input.invitation_id)
      
//       if (!invitation) {
//         throw new Error("Invitación no encontrada")
//       }

//       if (invitation.solicitation_status !== "pending") {
//         throw new Error("Esta invitación ya ha sido respondida")
//       }

//       // Update the invitation status
//       await friendshipGroupsModuleService.updateFriendInGroup(input.invitation_id, {
//         solicitation_status: input.response,
//         joined_at: input.response === "accepted" ? new Date() : invitation.joined_at,
//       })

//       const message = input.response === "accepted" 
//         ? "Te has unido al grupo exitosamente"
//         : "Has rechazado la invitación al grupo"

//       return new StepResponse({ message }, {
//         invitation_id: input.invitation_id,
//         original_status: invitation.solicitation_status,
//         original_joined_at: invitation.joined_at,
//       })
//     } catch (error) {
//       console.error("Error responding to group invitation:", error)
//       throw new Error(`Failed to respond to group invitation: ${error instanceof Error ? error.message : 'Unknown error'}`)
//     }
//   },
//   async (compensationData, { container }) => {
//     if (!compensationData) return

//     const friendshipGroupsModuleService = container.resolve(FRIENDSHIP_GROUPS_MODULE)

//     try {
//       // Revert the invitation status
//       await friendshipGroupsModuleService.updateFriendInGroup(compensationData.invitation_id, {
//         solicitation_status: compensationData.original_status,
//         joined_at: compensationData.original_joined_at,
//       })
//     } catch (error) {
//       console.error("Error in respond to group invitation compensation:", error)
//     }
//   }
// )
