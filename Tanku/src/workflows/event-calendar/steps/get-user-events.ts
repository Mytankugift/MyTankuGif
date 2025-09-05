import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface GetUserEventsInput {
  customer_id: string
}

export const getUserEventsStep = createStep(
  "get-user-events-step",
  async (input: GetUserEventsInput, { container }) => {
    const socialService: SocialModuleService = container.resolve(SOCIAL_MODULE)
    
    // Validate required fields
    if (!input.customer_id) {
      throw new Error("customer_id es obligatorio")
    }

    // Get user events
    const events = await socialService.listEventsCalendars({
      customer_id: input.customer_id
    }, {
      order: { event_date: "ASC" }
    })
    
    return new StepResponse(events, null)
  }
)
