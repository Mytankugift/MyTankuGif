import { model } from "@medusajs/framework/utils"

export const PosterComment = model.define("poster_comment", {
  id: model.id().primaryKey(),
  poster_id: model.text(), // ID del poster al que se comenta
  customer_id: model.text(), // ID del usuario que comenta
  content: model.text(), // Contenido del comentario
  parent_id: model.text().nullable(), // Para comentarios anidados (respuestas)
  likes_count: model.number().default(0), // Contador de likes del comentario
  is_active: model.boolean().default(true), // Para soft delete
}).indexes([
  { on: ["poster_id"] },
  { on: ["customer_id"] },
  { on: ["parent_id"] },
  { on: ["created_at"] } // Para ordenar por más recientes
])
