import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { completeOnboardingPhaseWorkflow } from "../../../../workflows/onboarding"

interface CompletePhaseRequest {
  customer_id: string
  phase: 'one' | 'two'
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { customer_id, phase } = req.body as CompletePhaseRequest

    if (!customer_id || !phase) {
      return res.status(400).json({
        success: false,
        message: "customer_id y phase son requeridos"
      })
    }

    if (phase !== 'one' && phase !== 'two') {
      return res.status(400).json({
        success: false,
        message: "phase debe ser 'one' o 'two'"
      })
    }

    const { result } = await completeOnboardingPhaseWorkflow(req.scope).run({
      input: { customer_id, phase }
    })

    return res.status(200).json({
      success: true,
      message: `Fase ${phase} completada exitosamente`,
      data: result
    })
  } catch (error) {
    console.error("Error al completar fase del onboarding:", error)
    return res.status(500).json({
      success: false,
      message: "Error al completar fase del onboarding",
      error: error.message,
    })
  }
}
