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

    // Subir archivos usando el workflow de Medusa si existen
    let imageUrl = ""
    let videoUrl = ""

    if (imageFile || videoFile) {
      try {
        const filesToUpload: any[] = []
        
        if (imageFile) {
          filesToUpload.push(imageFile)
        }
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


        // Validar que el resultado de subida existe
        if (!uploadResult) {
          console.error("Error al subir archivos: resultado vacío")
        } else {
          // Manejar la respuesta del upload
          let uploadedFiles: any[] = []
          
          if (Array.isArray(uploadResult)) {
            uploadedFiles = uploadResult
          } else if (uploadResult && typeof uploadResult === 'object') {
            if ((uploadResult as any).files && Array.isArray((uploadResult as any).files)) {
              uploadedFiles = (uploadResult as any).files
            } else if ((uploadResult as any).result && Array.isArray((uploadResult as any).result)) {
              uploadedFiles = (uploadResult as any).result
            }
          }

       
          // Asignar URLs basándose en el orden de subida
          for (let i = 0; i < uploadedFiles.length && i < filesToUpload.length; i++) {
            const uploadedFile = uploadedFiles[i] as any
            const originalFile = filesToUpload[i] as any
            
           
            
            const fileUrl = uploadedFile.url || uploadedFile.file_url || uploadedFile.path || ""
            
            if (originalFile.mimetype.startsWith('image/')) {
              imageUrl = fileUrl
            } else if (originalFile.mimetype.startsWith('video/')) {
              videoUrl = fileUrl
            }
          }
        }
      } catch (error) {
        console.error("Error uploading files:", error)
      }
    }

    // Validar que al menos tenemos título o descripción
    if (!title?.trim() && !description?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Se requiere al menos un título o descripción"
      })
    }

   

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
