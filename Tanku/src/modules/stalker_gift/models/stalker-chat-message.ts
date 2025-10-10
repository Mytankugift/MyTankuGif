import { model } from "@medusajs/framework/utils"

 const StalkerChatMessage = model.define("stalker_chat_message", {
  id: model.id().primaryKey(),
  conversation_id: model.text(), // ID de la conversación StalkerChatConversation
  sender_id: model.text(), // ID del usuario que envía el mensaje (giver o recipient)
  content: model.text(), // Contenido del mensaje
  message_type: model.text().default("text"), // "text", "image", "file", "audio", etc.
  file_url: model.text().nullable(), // URL del archivo si es multimedia
  reply_to_id: model.text().nullable(), // ID del mensaje al que responde (para hilos)
  is_edited: model.boolean().default(false), // Si el mensaje fue editado
  edited_at: model.dateTime().nullable(), // Timestamp de la última edición
  is_deleted: model.boolean().default(false), // Para soft delete de mensajes
}).indexes([
  { on: ["conversation_id"] },
  { on: ["sender_id"] },
  { on: ["created_at"] }, // Para ordenar mensajes cronológicamente
  { on: ["reply_to_id"] }, // Para consultar hilos de respuestas
  { on: ["is_deleted"] },
  { on: ["message_type"] }
])
export default StalkerChatMessage
