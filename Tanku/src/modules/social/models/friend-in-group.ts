import { model } from "@medusajs/framework/utils"

export const FriendInGroup = model.define("friend_in_group", {
  id: model.id().primaryKey(),
  group_id: model.text(),
  customer_id: model.text(),
  role: model.text().default("member"), // member, admin, moderator
  // Campo mantenido para uso futuro con sistema de invitaciones
  // Actualmente NO se usa en el modelo de Red Tanku (clasificación privada)
  // Valores posibles: "pending", "accepted", "rejected"
  // Ver: DOCUMENTACION_INVITACIONES_FUTURO.md y ANALISIS_SOLICITATION_STATUS.md
  solicitation_status: model.text().default("pending"),
  joined_at: model.dateTime(),
}).indexes([
  { on: ["group_id"] },
  { on: ["customer_id"] },
  { on: ["group_id", "customer_id"], unique: true }
])