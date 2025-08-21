import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { savePhaseOneWorkflow } from "../../../../workflows/onboarding/save-phase-one"

interface PhaseOneRequest {
  customer_id: string
  birth_date: string
  gender: string
  marital_status: string
  country: string
  city: string
  languages: string[]
  main_interests: string[]
  representative_colors: string[]
  favorite_activities: string[]
  important_celebrations: string[]
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const data = req.body as PhaseOneRequest

    if (!data.customer_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id es requerido"
      })
    }

    const { result } = await savePhaseOneWorkflow(req.scope).run({
      input: data
    })

    return res.status(200).json({
      success: true,
      message: "Datos de Fase 1 guardados exitosamente",
      data: result
    })
  } catch (error) {
    console.error("Error al guardar datos de Fase 1:", error)
    return res.status(500).json({
      success: false,
      message: "Error al guardar datos de Fase 1",
      error: error.message,
    })
  }
}
