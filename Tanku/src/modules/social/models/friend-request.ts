import { model } from "@medusajs/framework/utils"

export const FriendRequest = model.define("friend_request", {
  id: model.id().primaryKey(),
  sender_id: model.text(),
  receiver_id: model.text(),
  status: model.text().default("pending"),
  message: model.text().nullable(),
}).indexes([
  { on: ["sender_id"] },
  { on: ["receiver_id"] },
  { on: ["sender_id", "receiver_id"], unique: true }
])
