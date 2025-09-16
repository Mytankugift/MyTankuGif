import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface GetConversationMessagesInput {
  conversation_id: string
  limit?: number
  offset?: number
}

export const getConversationMessagesStep = createStep(
  "get-conversation-messages",
  async (data: GetConversationMessagesInput, { container }) => {
    const socialModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    const { conversation_id, limit = 50, offset = 0 } = data

    try {
      // Obtener mensajes de la conversación ordenados por fecha (más recientes primero)
      const messages = await socialModuleService.listChatMessages({
        conversation_id,
        is_deleted: false
      }, {
        order: { created_at: "DESC" },
        skip: offset,
        take: limit
      })

      // Obtener información de los usuarios que enviaron mensajes
      const senderIds = [...new Set(messages.map(msg => msg.sender_id))]
      
      // Aquí podrías enriquecer con información del customer si tienes acceso al módulo de customers
      // Por ahora devolvemos los mensajes tal como están
      
      return new StepResponse({
        messages: messages.reverse(), // Invertir para mostrar cronológicamente
        total_count: messages.length,
        has_more: messages.length === limit
      })

    } catch (error) {
      throw new Error(`Error al obtener mensajes: ${error.message}`)
    }
  }
)
