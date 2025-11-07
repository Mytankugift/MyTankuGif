import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SOCIAL_MODULE } from "../../../../modules/social";
import SocialModuleService from "../../../../modules/social/service";

interface RejectFriendRequestBody {
  sender_id: string
  receiver_id: string
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { sender_id, receiver_id } = req.body as RejectFriendRequestBody

    if (!sender_id || !receiver_id) {
      return res.status(400).json({
        error: "sender_id y receiver_id son requeridos"
      })
    }

    const socialModuleService: SocialModuleService = req.scope.resolve(
      SOCIAL_MODULE
    )

    // Buscar solicitud pendiente específica entre sender -> receiver
    const requests = await socialModuleService.listFriendRequests({
      sender_id,
      receiver_id,
      status: "pending"
    })

    const request = requests[0]
    if (!request) {
      return res.status(404).json({
        error: "Solicitud de amistad no encontrada o ya procesada"
      })
    }

    // Cambiar estado a rejected (o eliminar, según política)
    await socialModuleService.updateFriendRequests({
      id: request.id,
      status: "rejected"
    })

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error("Error al rechazar solicitud de amistad:", error)
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    })
  }
}


