import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export const getUserRedTankuGroupsStep = createStep(
  "get-user-red-tanku-groups",
  async (input: { user_id: string, contact_id: string }, { container }) => {
    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Get all Redes Tanku created by the user (private classification model)
      const userGroups = await friendshipGroupsModuleService.listFriendshipGroups({
        created_by: input.user_id,
      })

      // For each group, check if the contact is a member
      const groupsWithContact = await Promise.all(
        userGroups.map(async (group) => {
          // Check if contact is in this group
          const memberships = await friendshipGroupsModuleService.listFriendInGroups({
            group_id: group.id,
            customer_id: input.contact_id,
          })

          // If contact is a member, include this group
          if (memberships.length > 0) {
            return {
              id: group.id,
              group_name: group.group_name,
              description: group.description,
              image_url: group.image_url,
              created_at: group.created_at,
            }
          }

          return null
        })
      )

      // Filter out null values (groups where contact is not a member)
      const filteredGroups = groupsWithContact.filter(group => group !== null) as Array<{
        id: string
        group_name: string
        description?: string
        image_url?: string
        created_at: Date
      }>

      return new StepResponse(filteredGroups)
    } catch (error) {
      console.error("Error getting user Red Tanku groups:", error)
      throw new Error(`Failed to get user Red Tanku groups: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
)

