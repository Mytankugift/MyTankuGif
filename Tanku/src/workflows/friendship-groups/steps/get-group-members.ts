// import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
// import { FRIENDSHIP_GROUPS_MODULE } from "../../../modules/social"

// export const getGroupMembersStep = createStep(
//   "get-group-members",
//   async (input: { group_id: string }, { container }) => {
//     const friendshipGroupsModuleService = container.resolve(FRIENDSHIP_GROUPS_MODULE)

//     try {
//       // Get all accepted members of the group
//       const memberships = await friendshipGroupsModuleService.listFriendInGroup({
//         group_id: input.group_id,
//         solicitation_status: "accepted",
//       })

//       // Enrich with customer information
//       const enrichedMembers = await Promise.all(
//         memberships.map(async (membership) => {
//           const customerInfo = await friendshipGroupsModuleService.getCustomerInfo(membership.customer_id)
          
//           return {
//             id: membership.id,
//             customer_id: membership.customer_id,
//             first_name: customerInfo?.first_name || 'Usuario',
//             last_name: customerInfo?.last_name || '',
//             email: customerInfo?.email || '',
//             role: membership.role,
//             joined_at: membership.joined_at,
//             avatar_url: customerInfo?.avatar_url,
//           }
//         })
//       )

//       // Sort by role (admin first) and then by join date
//       enrichedMembers.sort((a, b) => {
//         if (a.role === 'admin' && b.role !== 'admin') return -1
//         if (b.role === 'admin' && a.role !== 'admin') return 1
//         return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
//       })

//       return new StepResponse(enrichedMembers)
//     } catch (error) {
//       console.error("Error getting group members:", error)
//       throw new Error(`Failed to get group members: ${error instanceof Error ? error.message : 'Unknown error'}`)
//     }
//   }
// )
