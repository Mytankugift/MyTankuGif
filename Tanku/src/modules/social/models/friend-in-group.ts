import { model } from "@medusajs/framework/utils"

export const FriendInGroup = model.define("friend_in_group", {
  id: model.id().primaryKey(),
  group_id: model.text(),
  customer_id: model.text(),
  role: model.text().default("member"), // member, admin, moderator
  joined_at: model.dateTime(),
}).indexes([
  { on: ["group_id"] },
  { on: ["customer_id"] },
  { on: ["group_id", "customer_id"], unique: true }
])