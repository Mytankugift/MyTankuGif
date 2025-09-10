import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { inviteToGroupWorkflow } from "../../../../workflows/friendship-groups"
import { z } from "zod"

const inviteToGroupSchema = z.object({
  group_id: z.string().min(1, "El ID del grupo es requerido"),
  friend_ids: z.array(z.string()).min(1, "Debe seleccionar al menos un amigo"),
  message: z.string().optional(),
  invited_by: z.string().min(1, "El ID del invitador es requerido"),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const validatedData = inviteToGroupSchema.parse(req.body)

    // Execute the workflow
    const { result } = await inviteToGroupWorkflow(req.scope).run({
      input: validatedData,
    })

    res.status(200).json({
      success: true,
      message: result.message,
      invitations_sent: result.invitations_sent
    })
  } catch (error) {
    console.error("Error inviting to group:", error)
    
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
