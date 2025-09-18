import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STALKER_GIFT_MODULE } from "../../../modules/stalker_gift"
import StalkerGiftModuleService from "../../../modules/stalker_gift/service"

export interface CreateStalkerGiftStepInput {
  total_amount: number
  first_name: string
  phone: string
  email: string
  alias: string
  recipient_name: string
  contact_methods: any[]
  products: any[]
  message?: string
  payment_method?: string
  payment_status?: string
}

export const createStalkerGiftStep = createStep(
  "create-stalker-gift-step",
  async (input: CreateStalkerGiftStepInput, { container }) => {
    const stalkerGiftModuleService : StalkerGiftModuleService = container.resolve(STALKER_GIFT_MODULE)

    const stalkerGiftData = {
      total_amount: input.total_amount,
      first_name: input.first_name,
      phone: input.phone,
      email: input.email,
      alias: input.alias,
      recipient_name: input.recipient_name,
      contact_methods: input.contact_methods as unknown as Record<string, unknown>,
      products: input.products as unknown as Record<string, unknown>,
      message: input.message || null,
      payment_method: input.payment_method || "epayco",
      payment_status: input.payment_status || "pending",
    }

    const stalkerGifts = await stalkerGiftModuleService.createStalkerGifts([stalkerGiftData])
    const stalkerGift = stalkerGifts[0] // Tomar el primer elemento del array

    return new StepResponse(stalkerGift, stalkerGift.id)
  },
 
)
