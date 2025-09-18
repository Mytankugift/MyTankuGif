import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STALKER_GIFT_MODULE } from "../../../modules/stalker_gift"
import StalkerGiftModuleService from "../../../modules/stalker_gift/service"

export interface UpdatePaymentStatusStepInput {
  id: string
  payment_status: "pending" | "success" | "failed"
  transaction_id?: string
}

export const updatePaymentStatusStep = createStep(
  "update-payment-status-step",
  async (input: UpdatePaymentStatusStepInput, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(STALKER_GIFT_MODULE)

    const updateData: any = {
      payment_status: input.payment_status,
    }

    if (input.transaction_id) {
      updateData.transaction_id = input.transaction_id
    }

    const stalkerGift = await stalkerGiftModuleService.updateStalkerGifts({
      id: input.id,
      ...updateData
    })

    return new StepResponse(stalkerGift)
  }
)
