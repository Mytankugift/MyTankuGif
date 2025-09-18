import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STALKER_GIFT_MODULE } from "../../../modules/stalker_gift"
import StalkerGiftModuleService from "../../../modules/stalker_gift/service"

export interface GetStalkerGiftStepInput {
  id: string
}

export const getStalkerGiftStep = createStep(
  "get-stalker-gift-step",
  async (input: GetStalkerGiftStepInput, { container }) => {
    const stalkerGiftModuleService: StalkerGiftModuleService = container.resolve(STALKER_GIFT_MODULE)

    const stalkerGift = await stalkerGiftModuleService.retrieveStalkerGift(input.id)

    return new StepResponse(stalkerGift)
  }
)
