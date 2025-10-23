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
  customer_giver_id?: string
  customer_recipient_id?: string
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
      customer_giver_id: input.customer_giver_id || null,
      customer_recipient_id: input.customer_recipient_id || null,
      payment_method: input.payment_method || "epayco",
      payment_status: input.payment_status || "pending",
    }

    console.log('=== CREANDO STALKER GIFT EN BD ===')
    console.log('Datos del stalker gift:', JSON.stringify(stalkerGiftData, null, 2))
    console.log('Productos a guardar:', JSON.stringify(input.products, null, 2))

    const stalkerGifts = await stalkerGiftModuleService.createStalkerGifts([stalkerGiftData])
    const stalkerGift = stalkerGifts[0] // Tomar el primer elemento del array

    return new StepResponse(stalkerGift, stalkerGift.id)
  },
 
)
