import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SOCIAL_MODULE } from "../../../../../modules/social"
import SocialModuleService from "../../../../../modules/social/service"
import { Modules } from "@medusajs/framework/utils"
import { PERSONAL_INFORMATION_MODULE } from "../../../../../modules/personal_information"
import PersonalInformationService from "../../../../../modules/personal_information/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { user_id } = req.params
    console.log("user_id:", user_id)
    // Verificar que user_id esté presente
    if (!user_id) {
      return res.status(400).json({
        error: "user_id es requerido"
      })
    }

    
    const socialModuleService: SocialModuleService = req.scope.resolve(
      SOCIAL_MODULE
    )
    const personalInfoService: PersonalInformationService = req.scope.resolve(PERSONAL_INFORMATION_MODULE)
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

    // Solicitudes ENVIADAS por el usuario (sender_id = user_id)
    const sentRequests = await socialModuleService.listFriendRequests({
      sender_id: user_id as string
    })

    const sentWithProfiles = await Promise.all(sentRequests.map(async (req) => {
      const customer = await customerModuleService.retrieveCustomer(req.receiver_id)
      const personalInfo = await personalInfoService.listPersonalInformations({
        customer_id: req.receiver_id
      })
      return {
        id: req.id,
        sender_id: req.sender_id,
        receiver_id: req.receiver_id,
        status: req.status,
        message: req.message,
        created_at: req.created_at,
        receiver: {
          ...customer,
          avatar_url: personalInfo[0]?.avatar_url || null,
        }
      }
    }))

    // Solicitudes RECIBIDAS por el usuario (receiver_id = user_id)
    const receivedRequests = await socialModuleService.listFriendRequests({
      receiver_id: user_id as string
    })

    const receivedWithProfiles = await Promise.all(receivedRequests.map(async (req) => {
      const customer = await customerModuleService.retrieveCustomer(req.sender_id)
      const personalInfo = await personalInfoService.listPersonalInformations({
        customer_id: req.sender_id
      })
      return {
        id: req.id,
        sender_id: req.sender_id,
        receiver_id: req.receiver_id,
        status: req.status,
        message: req.message,
        created_at: req.created_at,
        sender: {
          ...customer,
          avatar_url: personalInfo[0]?.avatar_url || null,
        }
      }
    }))

    return res.status(200).json({
      success: true,
      sent: sentWithProfiles,
      received: receivedWithProfiles,
    })
    
  } catch (error: any) {
    console.error("Error al obtener solicitudes de amistad:", error)
    
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    })
  }
}
