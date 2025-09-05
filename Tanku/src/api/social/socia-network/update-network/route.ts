import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { updateSocialNetworksWorkflow } from "../../../../workflows/personal_information/update-social-networks"

// Validation schema
const updateSocialNetworksSchema = z.object({
  customer_id: z.string().min(1, "Customer ID is required"),
  social_networks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
    tiktok: z.string().optional(),
    public_alias: z.string().optional(),
  })
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
   

    // Validar datos del formulario
    const validationResult = updateSocialNetworksSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: validationResult.error.errors
      })
    }

    const { customer_id, social_networks } = validationResult.data

    // Ejecutar el workflow para actualizar las redes sociales
    const { result } = await updateSocialNetworksWorkflow(req.scope).run({
      input: {
        customer_id,
        social_networks
      }
    })

   

    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      message: "Redes sociales actualizadas correctamente",
      data: result
    })

  } catch (error) {
    console.error("Error updating social networks:", error)
    
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}