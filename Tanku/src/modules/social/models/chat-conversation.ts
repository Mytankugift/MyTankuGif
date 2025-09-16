import { model } from "@medusajs/framework/utils"

export const ChatConversation = model.define("chat_conversation", {
  id: model.id().primaryKey(),
  conversation_type: model.text().default("direct"), // "direct" para chat 1:1, "group" para grupos
  relation_id: model.text(), // ID del Friend (para chats 1:1) o FriendshipGroups (para grupos)
  title: model.text().nullable(), // Título opcional para conversaciones grupales
  created_by: model.text(), // ID del usuario que creó la conversación
  last_message_id: model.text().nullable(), // ID del último mensaje para optimizar consultas
  last_message_at: model.dateTime().nullable(), // Timestamp del último mensaje
  is_active: model.boolean().default(true), // Para soft delete de conversaciones
}).indexes([
  { on: ["created_by"] },
  { on: ["conversation_type"] },
  { on: ["relation_id"] }, // Para buscar conversaciones por relación específica
  { on: ["conversation_type", "relation_id"], unique: true }, // Una conversación por relación
  { on: ["last_message_at"] }, // Para ordenar conversaciones por actividad reciente
  { on: ["is_active"] }
])
