import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STALKER_GIFT_MODULE } from "../../../modules/stalker_gift"
import StalkerGiftModuleService from "../../../modules/stalker_gift/service"

// GET /stalker-chat/conversations - Obtener conversación por stalker_gift_id
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { stalker_gift_id, customer_id } = req.query

    if (!stalker_gift_id || !customer_id) {
      res.status(400).json({
        success: false,
        error: "stalker_gift_id and customer_id are required"
      })
      return
    }

    const stalkerGiftModuleService: StalkerGiftModuleService = req.scope.resolve(STALKER_GIFT_MODULE)

    // Obtener información del StalkerGift
    const stalkerGifts = await stalkerGiftModuleService.listStalkerGifts({
      id: stalker_gift_id as string
    })

    if (!stalkerGifts || stalkerGifts.length === 0) {
      res.status(404).json({
        success: false,
        error: "StalkerGift not found"
      })
      return
    }

    const stalkerGift = stalkerGifts[0]

    // Verificar que el customer_id sea parte del regalo (giver o recipient)
    if (stalkerGift.customer_giver_id !== customer_id && stalkerGift.customer_recipient_id !== customer_id) {
      res.status(403).json({
        success: false,
        error: "Access denied to this conversation"
      })
      return
    }

    // Verificar que el regalo esté aceptado (recibida)
    if (stalkerGift.payment_status !== "recibida") {
      res.status(400).json({
        success: false,
        error: "StalkerGift must be accepted before starting chat",
        payment_status: stalkerGift.payment_status
      })
      return
    }

    // Buscar conversación existente
    let conversations = await stalkerGiftModuleService.listStalkerChatConversations({
      stalker_gift_id: stalker_gift_id as string
    })

    let conversation
    if (!conversations || conversations.length === 0) {
      // Crear conversación si no existe
      const newConversations = await stalkerGiftModuleService.createStalkerChatConversations([{
        stalker_gift_id: stalker_gift_id as string,
        customer_giver_id: stalkerGift.customer_giver_id || '',
        customer_recipient_id: stalkerGift.customer_recipient_id || '',
        is_enabled: true,
        enabled_at: new Date(),
        is_active: true
      }])
      conversation = newConversations[0]
      console.log(`[STALKER CHAT API] Created new conversation for StalkerGift ${stalker_gift_id}`)
    } else {
      conversation = conversations[0]
      
      // Habilitar conversación si no está habilitada
      if (!conversation.is_enabled) {
        const updatedConversations = await stalkerGiftModuleService.updateStalkerChatConversations([{
          id: conversation.id,
          is_enabled: true,
          enabled_at: new Date()
        }])
        conversation = updatedConversations[0]
      }
    }

    // Determinar el rol del usuario actual
    const isGiver = stalkerGift.customer_giver_id === customer_id
    const otherParticipantId = isGiver ? stalkerGift.customer_recipient_id : stalkerGift.customer_giver_id

    res.status(200).json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          stalker_gift_id: conversation.stalker_gift_id,
          is_enabled: conversation.is_enabled,
          enabled_at: conversation.enabled_at,
          last_message_at: conversation.last_message_at
        },
        stalker_gift: {
          id: stalkerGift.id,
          alias: stalkerGift.alias,
          recipient_name: stalkerGift.recipient_name,
          total_amount: stalkerGift.total_amount,
          products: stalkerGift.products,
          message: stalkerGift.message,
          payment_status: stalkerGift.payment_status
        },
        user_role: isGiver ? 'giver' : 'recipient',
        other_participant_id: otherParticipantId
      }
    })

  } catch (error) {
    console.error("[STALKER CHAT API] Error getting conversation:", error)
    res.status(500).json({
      success: false,
      error: "Failed to get conversation",
      message: (error as Error).message
    })
  }
}
