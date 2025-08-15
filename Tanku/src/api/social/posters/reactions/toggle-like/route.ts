import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { togglePosterLikeWorkflow } from "../../../../../workflows/poster"

// Validation schema for toggling like
const toggleLikeSchema = z.object({
  poster_id: z.string().min(1, "Poster ID is required"),
  customer_id: z.string().min(1, "Customer ID is required"),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Validar datos del cuerpo de la petición
    const validationResult = toggleLikeSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: validationResult.error.errors
      })
    }

    const { poster_id, customer_id } = validationResult.data

    // Ejecutar el workflow para alternar like
    const { result } = await togglePosterLikeWorkflow(req.scope).run({
      input: { poster_id, customer_id }
    })

    console.log("Poster like toggled successfully:", result)

    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      action: result.action, // "added" or "removed"
      reaction: result.reaction,
      likes_count: result.likes_count
    })

  } catch (error) {
    console.error("Error toggling poster like:", error)
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
