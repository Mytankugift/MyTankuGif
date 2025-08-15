import { model } from "@medusajs/framework/utils"

export const PosterReaction = model.define("poster_reaction", {
  id: model.id().primaryKey(),
  poster_id: model.text(), // ID del poster al que se reacciona
  customer_id: model.text(), // ID del usuario que reacciona
  reaction_type: model.enum(["like", "love", "laugh", "angry", "tanku"]),
}).indexes([
  { on: ["poster_id"] },
  { on: ["customer_id"] },
  { on: ["reaction_type"] },
  { on: ["poster_id", "customer_id"], unique: true }
])