import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateFriendshipGroupWorkflow } from "../../../../workflows/friendship-groups"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { z } from "zod"

const updateGroupSchema = z.object({
  group_id: z.string().min(1, "El ID del grupo es requerido"),
  group_name: z.string().min(1).optional(),
  description: z.string().optional(),
  image_url: z.string().optional(),
  updated_by: z.string().min(1, "El ID del usuario es requerido"),
})

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Parse form data for potential image upload
    const body = req.body as any
    console.log("Update group - Body:", body)
    console.log("Update group - Body keys:", Object.keys(body || {}))
    
    // When multer processes FormData, dataGroup comes as a string that needs to be parsed
    let formData: any
    if (body.dataGroup) {
      // If dataGroup is a string, parse it
      if (typeof body.dataGroup === 'string') {
        formData = JSON.parse(body.dataGroup)
      } else {
        // If it's already an object, use it directly
        formData = body.dataGroup
      }
    } else {
      // If dataGroup is not present, try to get data directly from body
      formData = body
    }
    
    const files = req.files as Express.Multer.File[]
    console.log("Update group - Files:", files?.length || 0)
    
    const groupData = {
      group_id: formData.group_id as string,
      group_name: formData.group_name as string,
      description: formData.description as string || undefined,
      updated_by: formData.updated_by as string,
    }

    let imageUrl: string | undefined = formData.image_url
    
    // Handle image upload if provided
    if (files?.length) {
      const { result } = await uploadFilesWorkflow(req.scope).run({
        input: {
          files: files.map((f) => ({
            filename: f.originalname,
            mimeType: f.mimetype,
            content: f.buffer.toString("binary"),
            access: "public",
          })),
        },
      })
      imageUrl = result[0].url
    }

    const validatedData = updateGroupSchema.parse({
      ...groupData,
      image_url: imageUrl,
    })

    // Execute the workflow
    const { result } = await updateFriendshipGroupWorkflow(req.scope).run({
      input: validatedData,
    })

    res.status(200).json({
      success: true,
      group: result.group,
      message: result.message
    })
  } catch (error) {
    console.error("Error updating friendship group:", error)
    
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

