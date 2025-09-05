import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { handleIncentivePopupWorkflow } from "../../../../workflows/onboarding"

interface IncentivePopupRequest {
  customer_id: string
  action: 'show' | 'dismiss'
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { customer_id, action } = req.body as IncentivePopupRequest

    if (!customer_id || !action) {
      return res.status(400).json({
        success: false,
        message: "customer_id y action son requeridos"
      })
    }

    if (action !== 'show' && action !== 'dismiss') {
      return res.status(400).json({
        success: false,
        message: "action debe ser 'show' o 'dismiss'"
      })
    }

    const { result } = await handleIncentivePopupWorkflow(req.scope).run({
      input: { customer_id, action }
    })

    return res.status(200).json({
      success: true,
      message: `Popup de incentivo ${action === 'show' ? 'mostrado' : 'descartado'} exitosamente`,
      data: result
    })
  } catch (error) {
    console.error("Error al manejar popup de incentivo:", error)
    return res.status(500).json({
      success: false,
      message: "Error al manejar popup de incentivo",
      error: error.message,
    })
  }
}
