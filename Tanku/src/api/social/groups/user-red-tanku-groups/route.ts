import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getUserRedTankuGroupsWorkflow } from "../../../../workflows/friendship-groups"
import { z } from "zod"

const getUserRedTankuGroupsSchema = z.object({
  user_id: z.string().min(1, "El ID del usuario es requerido"),
  contact_id: z.string().min(1, "El ID del contacto es requerido"),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const validatedData = getUserRedTankuGroupsSchema.parse(req.query)
    
    // Execute the workflow
    const { result } = await getUserRedTankuGroupsWorkflow(req.scope).run({
      input: validatedData,
    })

    res.status(200).json({
      success: true,
      groups: result.groups
    })
  } catch (error) {
    console.error("Error getting user Red Tanku groups:", error)
    
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

