import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { savePhaseTwoWorkflow } from "../../../../workflows/onboarding/save-phase-two"

interface PhaseTwoRequest {
  customer_id: string
  product_interests: string[]
  favorite_social_networks: string[]
  preferred_interaction: string[]
  purchase_frequency: string
  monthly_budget: string
  brand_preference: string
  purchase_motivation: string
  social_circles: string[]
  wants_connections: string
  connection_types: string[]
  lifestyle_style: string[]
  personal_values: string[]
  platform_expectations: string[]
  preferred_content_type: string[]
  connection_moments: string[]
  shopping_days: string
  ecommerce_experience: string
  social_activity_level: string
  notifications_preference: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const data = req.body as PhaseTwoRequest

    if (!data.customer_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id es requerido"
      })
    }

    const { result } = await savePhaseTwoWorkflow(req.scope).run({
      input: data
    })

    return res.status(200).json({
      success: true,
      message: "Datos de Fase 2 guardados exitosamente",
      data: result
    })
  } catch (error) {
    console.error("Error al guardar datos de Fase 2:", error)
    return res.status(500).json({
      success: false,
      message: "Error al guardar datos de Fase 2",
      error: error.message,
    })
  }
}
