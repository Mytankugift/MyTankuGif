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
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Al menos una imagen es requerida"
      })
    }

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

    for (const file of req.files as any[]) {
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

    // Validar que hay al menos una imagen
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        error: "Se requiere al menos una imagen"
      })
    }

    console.log("Image file:", imageFile?.originalname)
    console.log("Video file:", videoFile?.originalname || "None")

    // Subir archivos usando el workflow de Medusa
    const filesToUpload: any[] = [imageFile]
    if (videoFile) {
      filesToUpload.push(videoFile)
    }

    const { result: uploadResult } = await uploadFilesWorkflow(req.scope).run({
      input: {
        files: filesToUpload.map((file: any) => ({
          filename: file.originalname,
          mimeType: file.mimetype,
          content: file.buffer.toString("binary"),
          access: "public" 
        }))
      }
    })

    console.log("Upload result:", uploadResult)
    console.log("Upload result type:", typeof uploadResult)
    console.log("Upload result keys:", uploadResult ? Object.keys(uploadResult) : 'null')

    // Validar que el resultado de subida existe
    if (!uploadResult) {
      return res.status(500).json({
        success: false,
        error: "Error al subir archivos: resultado vacío"
      })
    }

    // Obtener URLs de los archivos subidos
    let imageUrl = ""
    let videoUrl = ""

    // El uploadFilesWorkflow retorna un array de FileDTO
    // Manejar la respuesta como array directo
    let uploadedFiles: any[] = []
    
    if (Array.isArray(uploadResult)) {
      uploadedFiles = uploadResult
    } else if (uploadResult && typeof uploadResult === 'object') {
      // Si es un objeto, intentar acceder a diferentes propiedades
      if ((uploadResult as any).files && Array.isArray((uploadResult as any).files)) {
        uploadedFiles = (uploadResult as any).files
      } else if ((uploadResult as any).result && Array.isArray((uploadResult as any).result)) {
        uploadedFiles = (uploadResult as any).result
      } else {
        console.error("Estructura de uploadResult no reconocida:", uploadResult)
        return res.status(500).json({
          success: false,
          error: "Error al procesar archivos subidos"
        })
      }
    } else {
      console.error("uploadResult no es un array ni objeto:", uploadResult)
      return res.status(500).json({
        success: false,
        error: "Error al procesar archivos subidos"
      })
    }

    console.log("Uploaded files found:", uploadedFiles.length)

    for (let i = 0; i < uploadedFiles.length && i < filesToUpload.length; i++) {
      const uploadedFile = uploadedFiles[i] as any
      const originalFile = filesToUpload[i] as any
      
      console.log(`Processing file ${i}:`, {
        uploaded: uploadedFile,
        original: originalFile.mimetype
      })
      
      if (originalFile.mimetype.startsWith('image/')) {
        imageUrl = uploadedFile.url || uploadedFile.file_url || uploadedFile.path || ""
      } else if (originalFile.mimetype.startsWith('video/')) {
        videoUrl = uploadedFile.url || uploadedFile.file_url || uploadedFile.path || ""
      }
    }

    // Validar que al menos tenemos la imagen
    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        error: "Error al obtener URL de la imagen subida"
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
        image_url: imageUrl,
        video_url: videoUrl || undefined
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
