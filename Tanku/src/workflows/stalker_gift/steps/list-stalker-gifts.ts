import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STALKER_GIFT_MODULE } from "../../../modules/stalker_gift"
import StalkerGiftModuleService from "../../../modules/stalker_gift/service"

export interface ListStalkerGiftsStepInput {
  customerId?: string
  limit?: number
  offset?: number
}

export const listStalkerGiftsStep = createStep(
  "list-stalker-gifts-step",
  async (input: ListStalkerGiftsStepInput, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(STALKER_GIFT_MODULE)

    const filters: any = {}
    
    // Si se proporciona customerId, filtrar por email del customer
    if (input.customerId) {
      // En este caso, podrías filtrar por email o agregar un campo customer_id al modelo
      // Por ahora filtraremos por email si es necesario
    }

    const config: any = {}
    
    if (input.limit) {
      config.take = input.limit
    }
    
    if (input.offset) {
      config.skip = input.offset
    }

    const stalkerGifts = await stalkerGiftModuleService.listStalkerGifts(filters, config)

    return new StepResponse(stalkerGifts)
  }
)
