import { model } from "@medusajs/framework/utils"

export const Poster = model.define("poster", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  title: model.text().nullable(),
  description: model.text().nullable(),
  image_url: model.text(),
  video_url: model.text().nullable(),
  likes_count: model.number().default(0),
  comments_count: model.number().default(0),
  is_active: model.boolean().default(true),
}).indexes([
  { on: ["customer_id"] },
  { on: ["is_active"] }
])