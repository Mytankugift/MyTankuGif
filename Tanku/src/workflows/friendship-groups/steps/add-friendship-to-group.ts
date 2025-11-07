import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service";

export const addFriendshipToGroupStep = createStep(
  "add-friendship-to-group",
  async (input: {
    group_id: string
    friend_ids: string[]
    added_by: string
  }, { container }) => {
    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Verify the group exists
      const group = await friendshipGroupsModuleService.retrieveFriendshipGroups(input.group_id)
      
      if (!group) {
        throw new Error("Grupo no encontrado")
      }

      // Check if user is the group creator (private classification model)
      // In the new model, only the creator can add contacts to their groups
      if (group.created_by !== input.added_by) {
        throw new Error("Solo el creador del grupo puede agregar contactos")
      }

      const addResults: { friendId: string, status: "already_member" | "added" | "error", contactId?: string }[] = []
      const createdContacts: string[] = []

      // Add contacts to the group
      for (const friendId of input.friend_ids) {
        try {
          // Check if contact is already in the group
          const existingMembership = await friendshipGroupsModuleService.listFriendInGroups({
            group_id: input.group_id,
            customer_id: friendId,
          })

          if (existingMembership.length > 0) {
            addResults.push({ friendId, status: "already_member" })
            continue
          }

          // Add the contact directly to the group (private classification model)
          // In the new model, contacts are added immediately without invitation
          const contact = await friendshipGroupsModuleService.createFriendInGroups({
            group_id: input.group_id,
            customer_id: friendId,
            role: "member",
            joined_at: new Date(),
          })

          createdContacts.push(contact.id)
          addResults.push({ friendId, status: "added", contactId: contact.id })
        } catch (error) {
          console.error(`Error adding contact ${friendId}:`, error)
          addResults.push({ friendId, status: "error" })
        }
      }

      const successfulAdds = addResults.filter(r => r.status === "added").length
      const message = `${successfulAdds} contacto(s) agregado(s) exitosamente`

      return new StepResponse({ 
        message,
        contacts_added: successfulAdds,
        results: addResults
      }, {
        created_contacts: createdContacts
      })
    } catch (error) {
      console.error("Error adding contacts to group:", error)
      throw new Error(`Failed to add contacts to group: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
  async (compensationData, { container }) => {
    if (!compensationData?.created_contacts) return

    const friendshipGroupsModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    try {
      // Remove all created contacts
      for (const contactId of compensationData.created_contacts) {
        await friendshipGroupsModuleService.deleteFriendInGroups(contactId)
      }
    } catch (error) {
      console.error("Error in add friendship to group compensation:", error)
    }
  }
)

