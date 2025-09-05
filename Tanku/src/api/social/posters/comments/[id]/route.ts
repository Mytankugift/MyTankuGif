import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { editPosterCommentWorkflow, deletePosterCommentWorkflow } from "../../../../../workflows/poster"

// Validation schema for editing comments
const editCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(1000, "Content too long"),
})

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const commentId = req.params.id as string
    
    if (!commentId) {
      return res.status(400).json({
        success: false,
        error: "Comment ID is required"
      })
    }

    // Validar datos del cuerpo de la petición
    const validationResult = editCommentSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: validationResult.error.errors
      })
    }

    const { content } = validationResult.data

    // Ejecutar el workflow para editar comentario
    const { result } = await editPosterCommentWorkflow(req.scope).run({
      input: { comment_id: commentId, content }
    })


    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      comment: result.comment
    })

  } catch (error) {
    console.error("Error editing poster comment:", error)
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const commentId = req.params.id as string
    
    if (!commentId) {
      return res.status(400).json({
        success: false,
        error: "Comment ID is required"
      })
    }

    // Ejecutar el workflow para eliminar comentario
    const { result } = await deletePosterCommentWorkflow(req.scope).run({
      input: { comment_id: commentId }
    })

    
    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      comments_count: result.comments_count
    })

  } catch (error) {
    console.error("Error deleting poster comment:", error)
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
