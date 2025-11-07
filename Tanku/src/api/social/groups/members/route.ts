import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getGroupMembersWorkflow, removeMemberFromGroupWorkflow } from "../../../../workflows/friendship-groups"
import { z } from "zod"

const getGroupMembersSchema = z.object({
  group_id: z.string().min(1, "El ID del grupo es requerido"),
})

const removeMemberSchema = z.object({
  group_id: z.string().min(1, "El ID del grupo es requerido"),
  member_id: z.string().min(1, "El ID del miembro es requerido"),
  removed_by: z.string().min(1, "El ID del usuario que elimina es requerido"),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { group_id } = getGroupMembersSchema.parse(req.query)

    // Execute the workflow
    const { result } = await getGroupMembersWorkflow(req.scope).run({
      input: { group_id },
    })

    res.status(200).json({
      success: true,
      members: result.members
    })
  } catch (error) {
    console.error("Error getting group members:", error)
    
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

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const validatedData = removeMemberSchema.parse(req.body)

    // Execute the workflow
    const { result } = await removeMemberFromGroupWorkflow(req.scope).run({
      input: validatedData,
    })

    res.status(200).json({
      success: result.success,
      message: result.message
    })
  } catch (error) {
    console.error("Error removing member from group:", error)
    
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
