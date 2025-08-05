import { model } from "@medusajs/framework/utils"

export const StoryFile = model.define("story_file", {
  id: model.id().primaryKey(),
  story_id: model.text(),
  file_url: model.text(),
  file_type: model.text(), 
  file_size: model.number().nullable(),
  duration: model.number().nullable(), // para videos en segundos
  order_index: model.number().default(0),
}).indexes([
  { on: ["story_id"] },
  { on: ["file_type"] },
  { on: ["story_id", "order_index"] }
])