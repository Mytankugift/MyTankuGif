import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"
import { Modules } from "@medusajs/framework/utils"

export interface GetUserPostersInput {
  customer_id: string
}

export const getUserPostersStep = createStep(
  "get-user-posters-step",
  async (input: GetUserPostersInput, { container }) => {
    const socialModuleService: SocialModuleService = container.resolve(
      SOCIAL_MODULE
    )
    const customerService = container.resolve(Modules.CUSTOMER)

    console.log("Getting posters for customer:", input.customer_id)

    // 1. Obtener posters del usuario
    const userPosters = await socialModuleService.listPosters({
      customer_id: input.customer_id,
      is_active: true
    })

    console.log("User posters found:", userPosters.length)

    // 2. Obtener información del customer para cada poster
    const postersWithCustomerInfo: any[] = []
    
    for (const poster of userPosters) {
      // Obtener información del customer
      let customerInfo: any = null
      try {
        customerInfo = await customerService.retrieveCustomer(poster.customer_id)
      } catch (error) {
        console.error(`Error retrieving customer ${poster.customer_id}:`, error)
      }
      
      postersWithCustomerInfo.push({
        ...poster,
        customer_name: customerInfo ? `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() || customerInfo.email : 'Usuario',
        customer_email: customerInfo?.email || '',
      })
    }

    console.log("Posters with customer info processed:", postersWithCustomerInfo.length)

    return new StepResponse({
      posters: postersWithCustomerInfo
    })
  }
)
