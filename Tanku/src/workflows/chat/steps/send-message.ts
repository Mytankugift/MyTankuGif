import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"
import { SOCKET_MODULE } from "../../../modules/socket"
import SocketModuleService from "../../../modules/socket/service"

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
    const socketService: SocketModuleService = container.resolve(SOCKET_MODULE)

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

    // 4. Obtener información de la conversación para Socket.IO
    const conversation = await socialModuleService.listChatConversations({
      id: conversation_id
    })

    // 5. Emitir evento Socket.IO a todos los participantes de la conversación
    if (conversation && conversation.length > 0) {
      const conv = conversation[0]
      
      // Obtener la amistad relacionada con esta conversación
      const friendship = await socialModuleService.listFriends({
        id: conv.relation_id
      })

      if (friendship && friendship.length > 0) {
        const friendRecord = friendship[0]
        
        // Determinar quién es el receptor (el que no es el remitente)
        const receiverId = friendRecord.customer_id === sender_id 
          ? friendRecord.friend_customer_id 
          : friendRecord.customer_id

        // Emitir el mensaje al receptor
        try {
          await socketService.emitToUser(receiverId, "new-message", {
            message: {
              ...message,
              sender_name: `Usuario ${sender_id}`, // Aquí podrías obtener el nombre real
              conversation_id: conversation_id
            },
            conversation: conv
          })
        } catch (socketError) {
          console.warn(`[SOCKET] Could not emit to user ${receiverId}:`, socketError.message)
        }

        // También emitir a la sala de la conversación
        try {
          await socketService.emitToConversation(conversation_id, "conversation-updated", {
            conversation_id: conversation_id,
            last_message: message,
            last_message_at: new Date()
          })
        } catch (socketError) {
          console.warn(`[SOCKET] Could not emit to conversation ${conversation_id}:`, socketError.message)
        }
      }
    }

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
