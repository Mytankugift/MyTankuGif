import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { MedusaError } from "@medusajs/framework/utils";
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows";
import { createUserStoryWorkflow, CreateUserStoryInput } from "../../../../workflows/user-story";

// Esquema para los datos de la story
const storyDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  timestamp: z.string().min(1, "El timestamp es obligatorio"),
  customer_id: z.string().min(1, "El customer_id es obligatorio"),
});

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    console.log("=== CREANDO STORY ===");
    console.log("Files received:", req.files);
    console.log("Body received:", req.body);
    
    const files = req.files as Express.Multer.File[];
    let mediaUrls: string[] = [];

    // Procesar archivos si existen
    if (files?.length) {
      console.log("Processing files:", files.length);
      
      const { result } = await uploadFilesWorkflow(req.scope).run({
        input: {
          files: files?.map((f) => ({
            filename: f.originalname,
            mimeType: f.mimetype,
            content: f.buffer.toString("binary"),
            access: "public",
          })),
        },
      });
      
      mediaUrls = result.map((r) => r.url);
      console.log("Generated URLs:", mediaUrls);
    }
    
    // Obtener datos de la story desde el body
    const body = req.body as any;
    const storyData = {
      title: body.title || undefined,
      description: body.description || undefined,
      timestamp: body.timestamp || new Date().toISOString(),
      customer_id: body.customer_id || undefined,
    };
    
    console.log("Story data:", storyData);
    
    // Validar datos
    const validatedData = storyDataSchema.parse(storyData);

    
    // Preparar datos para el workflow
    const workflowInput: CreateUserStoryInput = {
      customer_id: validatedData.customer_id,
      title: validatedData.title,
      description: validatedData.description,
      files: mediaUrls.map((url, index) => ({
        file_url: url,
        file_type: files[index].mimetype.startsWith('image/') ? 'image' : 'video',
        file_size: files[index].size,
        order_index: index,
      })),
    };
    
    console.log("Workflow input:", workflowInput);
    
    // Ejecutar el workflow
    const { result } = await createUserStoryWorkflow(req.scope).run({
      input: workflowInput,
    });
    
    console.log("Workflow result:", result);
    
    // Preparar respuesta para el frontend
    const response = {
      success: true,
      story: {
        id: result.story.id,
        title: result.story.title,
        description: result.story.description,
        media: result.storyFiles.map((file: any) => ({
          id: file.id,
          type: file.file_type,
          url: file.file_url,
        })),
        timestamp: result.story.created_at,
      },
    };
    
    console.log("Response:", response);
    res.status(201).json(response);
    
  } catch (error) {
    console.error("Error al crear la story:", error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Datos de la story inválidos",
        details: error.errors,
      });
      return;
    }
    
    if (error instanceof MedusaError) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};