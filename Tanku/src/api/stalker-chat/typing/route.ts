import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STALKER_GIFT_MODULE } from "../../../modules/stalker_gift"
import { SOCKET_MODULE } from "../../../modules/socket"
import StalkerGiftModuleService from "../../../modules/stalker_gift/service"
import SocketModuleService from "../../../modules/socket/service"

// POST /stalker-chat/typing - Manejar indicadores de escritura
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const body = req.body as {
      conversation_id?: string
      customer_id?: string
      is_typing?: boolean
    }
    const { conversation_id, customer_id, is_typing } = body

    if (!conversation_id || !customer_id || typeof is_typing !== 'boolean') {
      res.status(400).json({
        success: false,
        error: "conversation_id, customer_id, and is_typing are required"
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
    if (conversation.customer_giver_id !== customer_id && conversation.customer_recipient_id !== customer_id) {
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

    // Obtener información del StalkerGift para contexto
    const stalkerGifts = await stalkerGiftModuleService.listStalkerGifts({
      id: conversation.stalker_gift_id
    })
    
    const stalkerGift = stalkerGifts[0]
    const isGiver = stalkerGift?.customer_giver_id === customer_id
    const receiverId = isGiver ? stalkerGift?.customer_recipient_id : stalkerGift?.customer_giver_id

    // 🔥 Emitir evento Socket.IO de typing
    try {
      if (receiverId) {
        await socketService.emitToUser(receiverId, "stalker-user-typing", {
          conversation_id: conversation_id,
          user_id: customer_id,
          user_name: isGiver ? stalkerGift?.alias : stalkerGift?.recipient_name,
          is_typing: is_typing,
          timestamp: new Date().toISOString()
        })
      }

      // También emitir a la sala de la conversación
      await socketService.emitToConversation(`stalker_${conversation_id}`, "stalker-typing-update", {
        conversation_id: conversation_id,
        user_id: customer_id,
        is_typing: is_typing,
        timestamp: new Date().toISOString()
      })

      console.log(`[STALKER CHAT API] Typing event sent: ${customer_id} ${is_typing ? 'started' : 'stopped'} typing in ${conversation_id}`)
    } catch (socketError) {
      console.warn(`[STALKER CHAT API] Could not send typing event:`, socketError.message)
    }

    res.status(200).json({
      success: true,
      message: `Typing status updated: ${is_typing ? 'started' : 'stopped'}`
    })

  } catch (error) {
    console.error("[STALKER CHAT API] Error updating typing status:", error)
    res.status(500).json({
      success: false,
      error: "Failed to update typing status",
      message: (error as Error).message
    })
  }
}
