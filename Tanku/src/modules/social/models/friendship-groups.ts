import { model } from "@medusajs/framework/utils"

export const FriendshipGroups = model.define("friendship_groups", {
  id: model.id().primaryKey(),
  group_name: model.text(),
  description: model.text().nullable(),
  image_url: model.text().nullable(),
  created_by: model.text(),
  is_private: model.boolean().default(false),
}).indexes([
  { on: ["created_by"] },
  { on: ["group_name"] }
])