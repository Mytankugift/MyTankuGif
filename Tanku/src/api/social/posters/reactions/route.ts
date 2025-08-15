import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { getPosterReactionsWorkflow } from "../../../../workflows/poster"

// Validation schema for getting reactions
const getReactionsSchema = z.object({
  poster_id: z.string().min(1, "Poster ID is required"),
  customer_id: z.string().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Validar parámetros de consulta
    const validationResult = getReactionsSchema.safeParse(req.query)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Parámetros inválidos",
        details: validationResult.error.errors
      })
    }

    const { poster_id, customer_id } = validationResult.data

    // Ejecutar el workflow para obtener reacciones
    const { result } = await getPosterReactionsWorkflow(req.scope).run({
      input: { poster_id, customer_id }
    })

    console.log("Poster reactions retrieved successfully:", result.reactions.length)

    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      reactions: result.reactions,
      total_count: result.total_count,
      user_reaction: result.user_reaction
    })

  } catch (error) {
    console.error("Error getting poster reactions:", error)
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
