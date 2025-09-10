import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createFriendshipGroupWorkflow } from "../../../../workflows/friendship-groups"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows";
import { z } from "zod"

const createGroupSchema = z.object({
  group_name: z.string().min(1, "El nombre del grupo es requerido"),
  description: z.string().optional(),
  is_private: z.boolean().default(false),
  created_by: z.string().min(1, "El creador es requerido"),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Parse form data for potential image upload
    const formData = JSON.parse((req.body as any).dataGroup);
    const files = req.files as Express.Multer.File[];
    
    const groupData = {
      group_name: formData.group_name as string,
      description: formData.description as string || undefined,
      is_private: formData.is_private,
      created_by: formData.created_by as string,
    }

    // Validate the data 
    const validatedData = createGroupSchema.parse(groupData)

    let imageUrl: string | undefined;
    if (files?.length) {
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
        imageUrl = result[0].url;
    }
   

    // Execute the workflow
    const { result } = await createFriendshipGroupWorkflow(req.scope).run({
      input: {
        ...validatedData,
        image_url: imageUrl || undefined,
      },
    })

    res.status(201).json({
      success: true,
      group: result.group,
      message: "Grupo creado exitosamente"
    })
  } catch (error) {
    console.error("Error creating friendship group:", error)
    
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
