import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { createPosterWorkflow } from "../../../../workflows/poster"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"

// Validation schema
const createPosterSchema = z.object({
  customer_id: z.string().min(1, "Customer ID is required"),
  title: z.string().optional(),
  description: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("=== CREATE POSTER ENDPOINT ===")
    console.log("Files received:", req.files)
    console.log("Body received:", req.body)

    // Validar que hay archivos
    // Los archivos son opcionales ahora
    const files = req.files && Array.isArray(req.files) ? req.files : []

    // Validar datos del formulario
    const validationResult = createPosterSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: validationResult.error.errors
      })
    }

    const { customer_id, title, description } = validationResult.data

    // Separar archivos por tipo
    let imageFile: any = null
    let videoFile: any = null

    // Procesar archivos si existen
    if (files.length > 0) {
      for (const file of files) {
        if (file.mimetype.startsWith('image/')) {
          if (!imageFile) {
            imageFile = file
          }
        } else if (file.mimetype.startsWith('video/')) {
          if (!videoFile) {
            videoFile = file
          }
        }
      }
    }

    console.log("Image file:", imageFile?.originalname)
    console.log("Video file:", videoFile?.originalname || "None")

    // Subir archivos a Medusa si existen
    let imageUrl = ""
    let videoUrl = ""

    // Subir imagen si existe
    if (imageFile) {
      try {
        const fileService = req.scope.resolve("fileService") as any
        const uploadResult = await fileService.upload(imageFile)
        console.log("Image upload result:", uploadResult)

        if (uploadResult && uploadResult.url) {
          imageUrl = uploadResult.url
        } else {
          console.error("Error al subir la imagen")
        }
      } catch (error) {
        console.error("Error uploading image:", error)
      }
    }

    // Subir video si existe
    if (videoFile) {
      try {
        const fileService = req.scope.resolve("fileService") as any
        const videoUploadResult = await fileService.upload(videoFile)
        console.log("Video upload result:", videoUploadResult)
        
        if (videoUploadResult && videoUploadResult.url) {
          videoUrl = videoUploadResult.url
        }
      } catch (error) {
        console.error("Error uploading video:", error)
      }
    }

    // Validar que al menos tenemos título o descripción
    if (!title?.trim() && !description?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Se requiere al menos un título o descripción"
      })
    }

    console.log("Image URL:", imageUrl)
    console.log("Video URL:", videoUrl)

    // Crear el poster usando el workflow
    const { result: poster } = await createPosterWorkflow(req.scope).run({
      input: {
        customer_id,
        title,
        description,
        image_url: imageUrl || "",
        video_url: videoUrl || ""
      }
    })

    console.log("Poster created successfully:", poster.id)

    // Respuesta exitosa
    return res.status(201).json({
      success: true,
      poster: {
        id: poster.id,
        title: poster.title,
        description: poster.description,
        image_url: imageUrl,
        video_url: videoUrl,
        created_at: poster.created_at
      }
    })

  } catch (error) {
    console.error("Error creating poster:", error)
    
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
