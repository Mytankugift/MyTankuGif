import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { addFriendshipToGroupWorkflow } from "../../../../workflows/friendship-groups"
import { z } from "zod"

const addContactToGroupSchema = z.object({
  group_id: z.string().min(1, "El ID del grupo es requerido"),
  friend_ids: z.array(z.string()).min(1, "Debe seleccionar al menos un contacto"),
  added_by: z.string().min(1, "El ID del usuario es requerido"),
  // Legacy: support old field name for backward compatibility
  invited_by: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as any
    // Support both new and old field names
    const validatedData = addContactToGroupSchema.parse({
      ...body,
      added_by: body.added_by || body.invited_by,
    })

    // Execute the workflow
    const { result } = await addFriendshipToGroupWorkflow(req.scope).run({
      input: {
        group_id: validatedData.group_id,
        friend_ids: validatedData.friend_ids,
        added_by: validatedData.added_by,
      },
    })

    res.status(200).json({
      success: true,
      message: result.message,
      contacts_added: result.contacts_added
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
