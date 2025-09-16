import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface SendMessageInput {
  conversation_id: string
  sender_id: string
  content: string
  message_type?: string
  file_url?: string
  reply_to_id?: string
}

export const sendMessageStep = createStep(
  "send-message",
  async (data: SendMessageInput, { container }) => {
    const socialModuleService: SocialModuleService = container.resolve(SOCIAL_MODULE)

    const { 
      conversation_id, 
      sender_id, 
      content, 
      message_type = "text",
      file_url,
      reply_to_id 
    } = data

    // 1. Crear el mensaje
    const newMessage = await socialModuleService.createChatMessages([{
      conversation_id,
      sender_id,
      content,
      message_type,
      file_url,
      reply_to_id,
      is_edited: false,
      is_deleted: false
    }])

    const message = newMessage[0]

    // 2. Actualizar la conversación con el último mensaje
    await socialModuleService.updateChatConversations([{
      id: conversation_id,
      last_message_id: message.id,
      last_message_at: new Date()
    }])

    // 3. Crear estado del mensaje para el remitente
    // @ts-ignore
    await socialModuleService.createChatMessageStatuses([{
      message_id: message.id,
      customer_id: sender_id,
      status: "sent",
      status_at: new Date()
    }])

    return new StepResponse(
      {
        message,
        success: true
      },
      async () => {
        // Compensación: marcar mensaje como eliminado si algo falla
        try {
          await socialModuleService.updateChatMessages([{
            id: message.id,
            is_deleted: true
          }])
        } catch (error) {
          console.error("Error en compensación de envío de mensaje:", error)
        }
      }
    )
  }
)
