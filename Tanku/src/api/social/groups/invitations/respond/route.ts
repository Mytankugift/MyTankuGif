import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { respondToGroupInvitationWorkflow } from "../../../../../workflows/friendship-groups"
import { z } from "zod"

const respondToInvitationSchema = z.object({
  invitation_id: z.string().min(1, "El ID de la invitación es requerido"),
  response: z.enum(["accepted", "rejected"], {
    errorMap: () => ({ message: "La respuesta debe ser 'accepted' o 'rejected'" })
  }),
})

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const validatedData = respondToInvitationSchema.parse(req.body)

    // Execute the workflow
    const { result } = await respondToGroupInvitationWorkflow(req.scope).run({
      input: validatedData,
    })

    res.status(200).json({
      success: true,
      message: result.message
    })
  } catch (error) {
    console.error("Error responding to group invitation:", error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: error.errors
      })
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error interno del servidor"
    })
  }
}
