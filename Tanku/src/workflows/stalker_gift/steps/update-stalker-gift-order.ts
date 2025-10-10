import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STALKER_GIFT_MODULE } from "../../../modules/stalker_gift"
import StalkerGiftModuleService from "../../../modules/stalker_gift/service"
import { SOCKET_MODULE } from "../../../modules/socket"
import SocketModuleService from "../../../modules/socket/service"

export interface UpdateStalkerGiftOrderStepInput {
  stalker_gift_id: string
  customer_id: string
  payment_status?: string
}

export const updateStalkerGiftOrderStep = createStep(
  "update-stalker-gift-order-step",
  async (input: UpdateStalkerGiftOrderStepInput, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(STALKER_GIFT_MODULE)
    const socketService: SocketModuleService = container.resolve(SOCKET_MODULE)

    const updateData: any = {
      payment_status: input.payment_status || "recibida",
    }

    // Agregar customer_id si se proporciona
    if (input.customer_id) {
      updateData.customer_recipient_id = input.customer_id
    }

    const stalkerGift = await stalkerGiftModuleService.updateStalkerGifts({
      id: input.stalker_gift_id,
      ...updateData
    })

    // 🎯 Crear conversación automáticamente cuando se acepta el regalo
    if (input.customer_id && stalkerGift) {
      const gift = stalkerGift
      
      try {
        // Verificar si ya existe una conversación para este StalkerGift
        const existingConversation = await stalkerGiftModuleService.listStalkerChatConversations({
          stalker_gift_id: gift.id
        })

        let conversation
        if (!existingConversation || existingConversation.length === 0) {
          // Crear nueva conversación
          conversation = await stalkerGiftModuleService.createStalkerChatConversations([{
            stalker_gift_id: gift.id,
            customer_giver_id: gift.customer_giver_id || '',
            customer_recipient_id: gift.customer_recipient_id || '',
            is_enabled: true,
            enabled_at: new Date(),
            is_active: true
          }])

          console.log(`[STALKER CHAT] Created conversation for StalkerGift ${gift.id}`)
        } else {
          // Habilitar conversación existente
          conversation = await stalkerGiftModuleService.updateStalkerChatConversations([{
            id: existingConversation[0].id,
            is_enabled: true,
            enabled_at: new Date()
          }])

          console.log(`[STALKER CHAT] Enabled existing conversation for StalkerGift ${gift.id}`)
        }

        // 🔥 Emitir evento Socket.IO para notificar que el chat está disponible
        if (conversation && conversation.length > 0) {
          const conv = conversation[0]
          
          try {
            // Verificar que los IDs no sean null antes de emitir
            if (gift.customer_giver_id && gift.customer_recipient_id) {
              // Notificar al que envió el regalo
              await socketService.emitToUser(gift.customer_giver_id, "stalker-chat-enabled", {
                conversation_id: conv.id,
                stalker_gift_id: gift.id,
                message: "¡El destinatario ha aceptado tu regalo! Ya pueden chatear.",
                gift_info: {
                  alias: gift.alias,
                  recipient_name: gift.recipient_name,
                  total_amount: gift.total_amount,
                  products: gift.products
                }
              })

              // Notificar al que recibió el regalo
              await socketService.emitToUser(gift.customer_recipient_id, "stalker-chat-enabled", {
                conversation_id: conv.id,
                stalker_gift_id: gift.id,
                message: "¡Has aceptado un regalo! Puedes chatear con quien te lo envió.",
                gift_info: {
                  alias: gift.alias,
                  total_amount: gift.total_amount,
                  products: gift.products,
                  message: gift.message
                }
              })

              console.log(`[STALKER CHAT] Socket.IO notifications sent for conversation ${conv.id}`)
            }
          } catch (socketError) {
            console.warn(`[STALKER CHAT] Could not send Socket.IO notifications:`, socketError.message)
          }
        }

      } catch (error) {
        console.error(`[STALKER CHAT] Error creating/enabling conversation:`, error)
        // No fallar el step principal por errores del chat
      }
    }

    return new StepResponse(stalkerGift)
  }
)
