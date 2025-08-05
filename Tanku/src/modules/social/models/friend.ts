import { model } from "@medusajs/framework/utils"

export const Friend = model.define("friend", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  friend_customer_id: model.text(),
  role: model.text().default("friend"), // friend, best_friend, family, blocked
  friendship_date: model.dateTime(),
  is_favorite: model.boolean().default(false),
  nickname: model.text().nullable(),
}).indexes([
  { on: ["customer_id"] },
  { on: ["friend_customer_id"] },
  { on: ["customer_id", "friend_customer_id"], unique: true },
  { on: ["role"] }
])
