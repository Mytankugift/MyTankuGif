import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STALKER_GIFT_MODULE } from "../../../modules/stalker_gift"
import StalkerGiftModuleService from "../../../modules/stalker_gift/service"

export interface GetCustomerStalkerGiftsStepInput {
  customer_id: string
}

export const getCustomerStalkerGiftsStep = createStep(
  "get-customer-stalker-gifts-step",
  async (input: GetCustomerStalkerGiftsStepInput, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(STALKER_GIFT_MODULE)

    try {
      // Buscar StalkerGifts donde el customer sea el giver (quien envió)
      const giverGifts = await stalkerGiftModuleService.listStalkerGifts({
        customer_giver_id: input.customer_id
      })

      // Buscar StalkerGifts donde el customer sea el recipient (quien recibió)
      const recipientGifts = await stalkerGiftModuleService.listStalkerGifts({
        customer_recipient_id: input.customer_id
      })


      // Combinar y marcar el tipo de cada regalo
      const allGifts = [
        ...giverGifts.map(gift => ({
          ...gift,
          isGiver: true
        })),
        ...recipientGifts.map(gift => ({
          ...gift,
          isGiver: false
        }))
      ]

      // Ordenar por fecha de creación (más recientes primero)
      allGifts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())


      return new StepResponse(allGifts)
    } catch (error) {
      console.error('Error en getCustomerStalkerGiftsStep:', error)
      throw error
    }
  }
)
