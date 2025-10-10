import { model } from "@medusajs/framework/utils"

 const StalkerChatConversation = model.define("stalker_chat_conversation", {
  id: model.id().primaryKey(),
  stalker_gift_id: model.text(), // ID del StalkerGift que origina esta conversación
  customer_giver_id: model.text(), // ID del usuario que envió el regalo
  customer_recipient_id: model.text(), // ID del usuario que recibió el regalo
  is_enabled: model.boolean().default(false), // Si el chat está habilitado (el receptor debe habilitarlo)
  enabled_at: model.dateTime().nullable(), // Timestamp cuando se habilitó el chat
  last_message_id: model.text().nullable(), // ID del último mensaje para optimizar consultas
  last_message_at: model.dateTime().nullable(), // Timestamp del último mensaje
  is_active: model.boolean().default(true), // Para soft delete de conversaciones
}).indexes([
  { on: ["stalker_gift_id"], unique: true }, // Una conversación por StalkerGift
  { on: ["customer_giver_id"] },
  { on: ["customer_recipient_id"] },
  { on: ["is_enabled"] },
  { on: ["last_message_at"] }, // Para ordenar conversaciones por actividad reciente
  { on: ["is_active"] }
])
export default StalkerChatConversation
