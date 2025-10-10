import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STALKER_GIFT_MODULE } from "../../../modules/stalker_gift"
import { SOCKET_MODULE } from "../../../modules/socket"
import StalkerGiftModuleService from "../../../modules/stalker_gift/service"
import SocketModuleService from "../../../modules/socket/service"

export interface SendStalkerMessageStepInput {
  conversation_id: string
  sender_id: string
  content: string
  message_type?: string
  reply_to_id?: string
}

export const sendStalkerMessageStep = createStep(
  "send-stalker-message-step",
  async (input: SendStalkerMessageStepInput, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(STALKER_GIFT_MODULE)
    const socketService: SocketModuleService = container.resolve(SOCKET_MODULE)

    const { conversation_id, sender_id, content, message_type = "text", reply_to_id } = input

    try {
      // 1. Verificar que la conversación existe y está habilitada
      const conversations = await stalkerGiftModuleService.listStalkerChatConversations({
        id: conversation_id
      })

      if (!conversations || conversations.length === 0) {
        throw new Error("Conversation not found")
      }

      const conversation = conversations[0]

      if (!conversation.is_enabled) {
        throw new Error("Conversation is not enabled")
      }

      // Verificar acceso del usuario
      if (conversation.customer_giver_id !== sender_id && conversation.customer_recipient_id !== sender_id) {
        throw new Error("Access denied to this conversation")
      }

      // 2. Crear el mensaje
      const newMessages = await stalkerGiftModuleService.createStalkerChatMessages([{
        conversation_id,
        sender_id,
        content,
        message_type,
        reply_to_id: reply_to_id || null,
        is_edited: false,
        is_deleted: false
      }])

      const message = newMessages[0]

      // 3. Determinar el receptor
      const receiverId = conversation.customer_giver_id === sender_id 
        ? conversation.customer_recipient_id 
        : conversation.customer_giver_id

      // 4. Crear estado del mensaje para el receptor
      if (receiverId) {
        // @ts-ignore
        await stalkerGiftModuleService.createStalkerMessageStatuses([{
          message_id: message.id,
          customer_id: receiverId,
          status: "sent",
          status_at: new Date()
        }])
      }

      // 5. Actualizar última actividad de la conversación
      await stalkerGiftModuleService.updateStalkerChatConversations([{
        id: conversation_id,
        last_message_id: message.id,
        last_message_at: new Date()
      }])

      // 6. Obtener información del StalkerGift para contexto
      const stalkerGifts = await stalkerGiftModuleService.listStalkerGifts({
        id: conversation.stalker_gift_id
      })
      
      const stalkerGift = stalkerGifts[0]
      const isGiver = stalkerGift?.customer_giver_id === sender_id

      // 7. 🔥 Emitir eventos Socket.IO
      try {
        // Emitir mensaje al receptor
        if (receiverId) {
          await socketService.emitToUser(receiverId, "stalker-new-message", {
            message: {
              ...message,
              sender_name: isGiver ? stalkerGift?.alias : stalkerGift?.recipient_name,
              conversation_id: conversation_id
            },
            conversation: {
              id: conversation.id,
              stalker_gift_id: conversation.stalker_gift_id,
              last_message_at: new Date()
            },
            stalker_gift: {
              id: stalkerGift?.id,
              alias: stalkerGift?.alias,
              recipient_name: stalkerGift?.recipient_name
            }
          })
        }

        // Emitir actualización de conversación a la sala
        await socketService.emitToConversation(`stalker_${conversation_id}`, "stalker-conversation-updated", {
          conversation_id: conversation_id,
          last_message: message,
          last_message_at: new Date()
        })

        console.log(`[STALKER CHAT WORKFLOW] Socket.IO events sent for message ${message.id}`)
      } catch (socketError) {
        console.warn(`[STALKER CHAT WORKFLOW] Could not send Socket.IO events:`, socketError.message)
      }

      return new StepResponse({
        message,
        conversation,
        stalker_gift: stalkerGift
      })

    } catch (error) {
      console.error(`[STALKER CHAT WORKFLOW] Error sending message:`, error)
      throw error
    }
  }
)
