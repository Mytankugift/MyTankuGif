// import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
// import { FRIENDSHIP_GROUPS_MODULE } from "../../../modules/social"

// export const inviteToGroupStep = createStep(
//   "invite-to-group",
//   async (input: {
//     group_id: string
//     friend_ids: string[]
//     message?: string
//     invited_by: string
//   }, { container }) => {
//     const friendshipGroupsModuleService = container.resolve(FRIENDSHIP_GROUPS_MODULE)

//     try {
//       // Verify the group exists and the inviter has permission
//       const group = await friendshipGroupsModuleService.retrieveFriendshipGroups(input.group_id)
      
//       if (!group) {
//         throw new Error("Grupo no encontrado")
//       }

//       // Check if inviter is admin or group creator
//       const inviterMembership = await friendshipGroupsModuleService.listFriendInGroup({
//         group_id: input.group_id,
//         customer_id: input.invited_by,
//         solicitation_status: "accepted",
//       })

//       if (inviterMembership.length === 0 || 
//           (inviterMembership[0].role !== "admin" && group.created_by !== input.invited_by)) {
//         throw new Error("No tienes permisos para invitar a este grupo")
//       }

//       const invitationResults = []
//       const createdInvitations = []

//       // Create invitations for each friend
//       for (const friendId of input.friend_ids) {
//         try {
//           // Check if friend is already a member or has pending invitation
//           const existingMembership = await friendshipGroupsModuleService.listFriendInGroup({
//             group_id: input.group_id,
//             customer_id: friendId,
//           })

//           if (existingMembership.length > 0) {
//             const status = existingMembership[0].solicitation_status
//             if (status === "accepted") {
//               invitationResults.push({ friendId, status: "already_member" })
//               continue
//             } else if (status === "pending") {
//               invitationResults.push({ friendId, status: "already_invited" })
//               continue
//             }
//           }

//           // Create the invitation
//           const invitation = await friendshipGroupsModuleService.createFriendInGroup({
//             group_id: input.group_id,
//             customer_id: friendId,
//             role: "member",
//             solicitation_status: "pending",
//             joined_at: new Date(), // This will be the invitation date
//           })

//           createdInvitations.push(invitation.id)
//           invitationResults.push({ friendId, status: "invited", invitationId: invitation.id })
//         } catch (error) {
//           console.error(`Error inviting friend ${friendId}:`, error)
//           invitationResults.push({ friendId, status: "error" })
//         }
//       }

//       const successfulInvitations = invitationResults.filter(r => r.status === "invited").length
//       const message = `${successfulInvitations} invitación(es) enviada(s) exitosamente`

//       return new StepResponse({ 
//         message,
//         invitations_sent: successfulInvitations,
//         results: invitationResults
//       }, {
//         created_invitations: createdInvitations
//       })
//     } catch (error) {
//       console.error("Error inviting to group:", error)
//       throw new Error(`Failed to invite to group: ${error instanceof Error ? error.message : 'Unknown error'}`)
//     }
//   },
//   async (compensationData, { container }) => {
//     if (!compensationData?.created_invitations) return

//     const friendshipGroupsModuleService = container.resolve(FRIENDSHIP_GROUPS_MODULE)

//     try {
//       // Remove all created invitations
//       for (const invitationId of compensationData.created_invitations) {
//         await friendshipGroupsModuleService.deleteFriendInGroup(invitationId)
//       }
//     } catch (error) {
//       console.error("Error in invite to group compensation:", error)
//     }
//   }
// )
