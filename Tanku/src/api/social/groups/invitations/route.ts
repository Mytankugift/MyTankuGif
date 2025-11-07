import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

const getInvitationsSchema = z.object({
  user_id: z.string().min(1, "El ID del usuario es requerido"),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // In the new private classification model, there are no invitations
    // This endpoint is kept for backward compatibility but always returns empty
    res.status(200).json({
      success: true,
      invitations: []
    })
  } catch (error) {
    console.error("Error getting group invitations:", error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Parámetros inválidos",
        details: error.errors
      })
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error interno del servidor"
    })
  }
}
