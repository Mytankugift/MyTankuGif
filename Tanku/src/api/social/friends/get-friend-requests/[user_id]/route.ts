import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SOCIAL_MODULE } from "../../../../../modules/social"
import SocialModuleService from "../../../../../modules/social/service"
import { Modules } from "@medusajs/framework/utils"
import { PERSONAL_INFORMATION_MODULE } from "../../../../../modules/personal_information"

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
    const personalInfoService = req.scope.resolve(PERSONAL_INFORMATION_MODULE)
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    
    // Obtener las solicitudes de amistad enviadas por el usuario
    const sentRequests = await socialModuleService.listFriends({
      customer_id: user_id as string
    })
    const dataCustomer = await Promise.all(sentRequests.map(async (friend) => {
      const customer = await customerModuleService.retrieveCustomer(friend.friend_customer_id)
      
      const personalInfo = await personalInfoService.listPersonalInformations({
        customer_id: friend.friend_customer_id
      })
      console.log("personalInfo:", personalInfo)

      return {
        ...friend,
        ...customer,
        avatar_url: personalInfo[0]?.avatar_url || null,
      }
    }))
        
    return res.status(200).json({
      success: true,
      sent_requests: dataCustomer,
    })
    
  } catch (error: any) {
    console.error("Error al obtener solicitudes de amistad:", error)
    
    return res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    })
  }
}
