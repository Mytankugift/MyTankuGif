import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STALKER_GIFT_MODULE } from "../../../modules/stalker_gift"
import { SOCKET_MODULE } from "../../../modules/socket"
import StalkerGiftModuleService from "../../../modules/stalker_gift/service"
import SocketModuleService from "../../../modules/socket/service"

// GET /stalker-chat/messages - Obtener mensajes de una conversación
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { conversation_id, customer_id, limit = 50, offset = 0 } = req.query

    if (!conversation_id || !customer_id) {
      res.status(400).json({
        success: false,
        error: "conversation_id and customer_id are required"
      })
      return
    }

    const stalkerGiftModuleService: StalkerGiftModuleService = req.scope.resolve(STALKER_GIFT_MODULE)

    // Verificar que la conversación existe y el usuario tiene acceso
    const conversations = await stalkerGiftModuleService.listStalkerChatConversations({
      id: conversation_id as string
    })

    if (!conversations || conversations.length === 0) {
      res.status(404).json({
        success: false,
        error: "Conversation not found"
      })
      return
    }

    const conversation = conversations[0]

    // Verificar acceso del usuario
    if (conversation.customer_giver_id !== customer_id && conversation.customer_recipient_id !== customer_id) {
      res.status(403).json({
        success: false,
        error: "Access denied to this conversation"
      })
      return
    }

    // Obtener mensajes
    const messages = await stalkerGiftModuleService.listStalkerChatMessages({
      conversation_id: conversation_id as string,
      is_deleted: false
    })

    // Ordenar por fecha de creación (más recientes primero para paginación)
    const sortedMessages = messages
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(Number(offset), Number(offset) + Number(limit))
      .reverse() // Invertir para mostrar cronológicamente

    // Obtener estados de los mensajes para el usuario actual
    const messageIds = sortedMessages.map(msg => msg.id)
    let messageStatuses: any[] = []
    
    if (messageIds.length > 0) {
      //@ts-ignore
      messageStatuses = await stalkerGiftModuleService.listStalkerMessageStatuses({
        message_id: messageIds,
        customer_id: customer_id as string
      })
    }

    // Combinar mensajes con sus estados
    const messagesWithStatus = sortedMessages.map(message => {
      const status = messageStatuses.find(s => s.message_id === message.id)
      return {
        ...message,
        status: status?.status || 'sent',
        status_at: status?.status_at || message.created_at
      }
    })

    res.status(200).json({
      success: true,
      data: {
        messages: messagesWithStatus,
        conversation_id: conversation_id,
        total: messages.length,
        has_more: Number(offset) + Number(limit) < messages.length
      }
    })

  } catch (error) {
    console.error("[STALKER CHAT API] Error getting messages:", error)
    res.status(500).json({
      success: false,
      error: "Failed to get messages",
      message: (error as Error).message
    })
  }
}

// POST /stalker-chat/messages - Enviar un mensaje
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const body = req.body as {
      conversation_id?: string
      sender_id?: string
      content?: string
      message_type?: string
      reply_to_id?: string
    }
    const { conversation_id, sender_id, content, message_type = "text", reply_to_id } = body

    if (!conversation_id || !sender_id || !content) {
      res.status(400).json({
        success: false,
        error: "conversation_id, sender_id, and content are required"
      })
      return
    }

    const stalkerGiftModuleService: StalkerGiftModuleService = req.scope.resolve(STALKER_GIFT_MODULE)
    const socketService: SocketModuleService = req.scope.resolve(SOCKET_MODULE)

    // Verificar que la conversación existe y el usuario tiene acceso
    const conversations = await stalkerGiftModuleService.listStalkerChatConversations({
      id: conversation_id
    })

    if (!conversations || conversations.length === 0) {
      res.status(404).json({
        success: false,
        error: "Conversation not found"
      })
      return
    }

    const conversation = conversations[0]

    // Verificar acceso del usuario
    if (conversation.customer_giver_id !== sender_id && conversation.customer_recipient_id !== sender_id) {
      res.status(403).json({
        success: false,
        error: "Access denied to this conversation"
      })
      return
    }

    // Verificar que la conversación esté habilitada
    if (!conversation.is_enabled) {
      res.status(400).json({
        success: false,
        error: "Conversation is not enabled"
      })
      return
    }

    // Crear el mensaje
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

    // Determinar el receptor
    const receiverId = conversation.customer_giver_id === sender_id 
      ? conversation.customer_recipient_id 
      : conversation.customer_giver_id

    // Crear estado del mensaje para el receptor
    if (receiverId) {
      //@ts-ignore
      await stalkerGiftModuleService.createStalkerMessageStatuses([{
        message_id: message.id,
        customer_id: receiverId,
        status: "sent",
        status_at: new Date()
      }])
    }

    // Actualizar última actividad de la conversación
    await stalkerGiftModuleService.updateStalkerChatConversations([{
      id: conversation_id,
      last_message_id: message.id,
      last_message_at: new Date()
    }])

    // 🔥 Emitir eventos Socket.IO
    try {
      // Obtener información del StalkerGift para contexto
      const stalkerGifts = await stalkerGiftModuleService.listStalkerGifts({
        id: conversation.stalker_gift_id
      })
      
      const stalkerGift = stalkerGifts[0]
      const isGiver = stalkerGift?.customer_giver_id === sender_id

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

      console.log(`[STALKER CHAT API] Socket.IO events sent for message ${message.id}`)
    } catch (socketError) {
      console.warn(`[STALKER CHAT API] Could not send Socket.IO events:`, socketError.message)
    }

    res.status(201).json({
      success: true,
      data: {
        message: {
          ...message,
          status: "sent",
          status_at: message.created_at
        }
      }
    })

  } catch (error) {
    console.error("[STALKER CHAT API] Error sending message:", error)
    res.status(500).json({
      success: false,
      error: "Failed to send message",
      message: (error as Error).message
    })
  }
}
