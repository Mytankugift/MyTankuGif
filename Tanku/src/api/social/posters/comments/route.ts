import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { getPosterCommentsWorkflow, addPosterCommentWorkflow } from "../../../../workflows/poster"

// Validation schema for getting comments
const getCommentsSchema = z.object({
  poster_id: z.string().min(1, "Poster ID is required"),
})

// Validation schema for adding comments
const addCommentSchema = z.object({
  poster_id: z.string().min(1, "Poster ID is required"),
  customer_id: z.string().min(1, "Customer ID is required"),
  content: z.string().min(1, "Content is required").max(1000, "Content too long"),
  parent_id: z.string().nullable().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Validar parámetros de consulta
    const validationResult = getCommentsSchema.safeParse(req.query)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Parámetros inválidos",
        details: validationResult.error.errors
      })
    }

    const { poster_id } = validationResult.data

    // Ejecutar el workflow para obtener comentarios
    const { result } = await getPosterCommentsWorkflow(req.scope).run({
      input: { poster_id }
    })

   

    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      comments: result.comments,
      total_count: result.total_count
    })

  } catch (error) {
    console.error("Error getting poster comments:", error)
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Validar datos del cuerpo de la petición
    const validationResult = addCommentSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: validationResult.error.errors
      })
    }

    const { poster_id, customer_id, content, parent_id } = validationResult.data

    // Ejecutar el workflow para agregar comentario
    const { result } = await addPosterCommentWorkflow(req.scope).run({
      input: { poster_id, customer_id, content, parent_id }
    })

    

    // Respuesta exitosa
    return res.status(201).json({
      success: true,
      comment: result.comment,
      comments_count: result.comments_count
    })

  } catch (error) {
    console.error("Error adding poster comment:", error)
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
