import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { getUserPostersWorkflow } from "../../../../workflows/poster"

// Validation schema
const getPostersSchema = z.object({
  customer_id: z.string().min(1, "Customer ID is required"),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("=== GET POSTERS ENDPOINT ===")
    console.log("Query params:", req.query)

    // Validar parámetros de consulta
    const validationResult = getPostersSchema.safeParse(req.query)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Parámetros inválidos",
        details: validationResult.error.errors
      })
    }

    const { customer_id } = validationResult.data

    console.log("Getting posters for customer:", customer_id)

    // Ejecutar el workflow para obtener posters
    const { result } = await getUserPostersWorkflow(req.scope).run({
      input: { customer_id }
    })

    console.log("Posters retrieved successfully:", result.posters.length)
    console.log("Posters:", result.posters)

    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      posters: result.posters
    })

  } catch (error) {
    console.error("Error getting posters:", error)
    
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
