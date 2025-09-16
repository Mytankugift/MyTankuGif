import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface GetOrCreateConversationInput {
  customer_id: string
  friend_customer_id: string
}

export const getOrCreateConversationStep = createStep(
  "get-or-create-conversation",
  async (data: GetOrCreateConversationInput, { container }) => {
    const socialModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    const { customer_id, friend_customer_id } = data

    try {
      // 1. Buscar la relación de amistad (puede estar en cualquier dirección)
      let friendship = await socialModuleService.listFriends({
        $or: [
          { customer_id, friend_customer_id },
          { customer_id: friend_customer_id, friend_customer_id: customer_id }
        ]
      })

      if (!friendship || friendship.length === 0) {
        throw new Error("No existe relación de amistad entre estos usuarios")
      }

      const friendRecord = friendship[0]

      // 2. Buscar si ya existe una conversación para esta amistad
      let conversation = await socialModuleService.listChatConversations({
        conversation_type: "direct",
        relation_id: friendRecord.id
      })

      // 3. Si no existe conversación, crearla
      if (!conversation || conversation.length === 0) {
        const newConversation = await socialModuleService.createChatConversations([{
          conversation_type: "direct",
          relation_id: friendRecord.id,
          created_by: customer_id,
          is_active: true
        }])

        conversation = newConversation
      }
      console.log("conversation", conversation)

      return new StepResponse({
        conversation: conversation[0],
        friendship: friendRecord
      })

    } catch (error) {
      throw new Error(`Error al obtener/crear conversación: ${error.message}`)
    }
  }
)
