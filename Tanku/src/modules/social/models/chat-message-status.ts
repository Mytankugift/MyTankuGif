import { model } from "@medusajs/framework/utils"

export const ChatMessageStatus = model.define("chat_message_status", {
  id: model.id().primaryKey(),
  message_id: model.text(), // ID del mensaje
  customer_id: model.text(), // ID del usuario que recibió el mensaje
  status: model.text().default("sent"), // "sent", "delivered", "read"
  status_at: model.dateTime(), // Timestamp del cambio de estado
}).indexes([
  { on: ["message_id"] },
  { on: ["customer_id"] },
  { on: ["message_id", "customer_id"], unique: true }, // Un estado por mensaje por usuario
  { on: ["status"] },
  { on: ["status_at"] }
])
