import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SOCIAL_MODULE } from "../../../../modules/social"
import SocialModuleService from "../../../../modules/social/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { user_id } = req.query
    
    // Verificar que user_id esté presente
    if (!user_id) {
      return res.status(400).json({
        error: "user_id es requerido"
      })
    }
    
    const socialModuleService: SocialModuleService = req.scope.resolve(
      SOCIAL_MODULE
    )
    
    // Obtener las solicitudes de amistad enviadas por el usuario
    const sentRequests = await socialModuleService.listFriendRequests({
      sender_id: user_id as string
    })
    
    // Obtener las solicitudes de amistad recibidas por el usuario
    const receivedRequests = await socialModuleService.listFriendRequests({
      receiver_id: user_id as string
    })
    
    return res.status(200).json({
      success: true,
      sent_requests: sentRequests,
      received_requests: receivedRequests
    })
    
  } catch (error: any) {
    console.error("Error al obtener solicitudes de amistad:", error)
    
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    })
  }
}
