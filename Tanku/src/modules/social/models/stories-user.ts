import { model } from "@medusajs/framework/utils"

export const StoriesUser = model.define("stories_user", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  title: model.text(),
  description: model.text().nullable(),
  duration: model.number().default(24), 
  views_count: model.number().default(0),
  is_active: model.boolean().default(true),
  expires_at: model.dateTime(),
}).indexes([
  { on: ["customer_id"] },
  { on: ["expires_at"] },
  { on: ["is_active"] }
])