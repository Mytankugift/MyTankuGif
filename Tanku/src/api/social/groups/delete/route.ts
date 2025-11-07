import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteFriendshipGroupWorkflow } from "../../../../workflows/friendship-groups"
import { z } from "zod"

const deleteGroupSchema = z.object({
  group_id: z.string().min(1, "El ID del grupo es requerido"),
  deleted_by: z.string().min(1, "El ID del usuario es requerido"),
})

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Try to get from body first, then from query (for compatibility)
    const body = req.body as any
    const query = req.query as any
    
    console.log("Delete group - Body:", body)
    console.log("Delete group - Query:", query)
    
    const groupId = body?.group_id || query?.group_id
    const deletedBy = body?.deleted_by || query?.deleted_by
    
    if (!groupId || !deletedBy) {
      return res.status(400).json({
        success: false,
        error: "group_id y deleted_by son requeridos",
        received: { body, query }
      })
    }
    
    const validatedData = deleteGroupSchema.parse({
      group_id: groupId,
      deleted_by: deletedBy,
    })

    // Execute the workflow
    const { result } = await deleteFriendshipGroupWorkflow(req.scope).run({
      input: validatedData,
    })

    res.status(200).json({
      success: true,
      message: result.message
    })
  } catch (error) {
    console.error("Error deleting friendship group:", error)
    
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

