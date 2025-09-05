import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface CreateEventCalendarInput {
  customer_id: string
  event_name: string
  event_date: string
  description?: string
  event_type: string
}

export const createEventCalendarStep = createStep(
  "create-event-calendar-step",
  async (input: CreateEventCalendarInput, { container }) => {
    const socialService: SocialModuleService = container.resolve(SOCIAL_MODULE)
    
    // Validate required fields
    if (!input.customer_id || !input.event_name || !input.event_date) {
      throw new Error("customer_id, event_name y event_date son campos obligatorios")
    }

    // Create the event
    const eventData = {
      customer_id: input.customer_id,
      event_name: input.event_name,
      event_date: new Date(input.event_date),
      description: input.description || null,
      location: input.event_type || null, // Using location field to store event_type
    }

    const createdEvent = await socialService.createEventsCalendars([eventData])
    
    return new StepResponse(createdEvent[0], {
      eventId: createdEvent[0].id
    })
  },
  async (compensationInput, { container }) => {
    if (compensationInput?.eventId) {
      const socialService: SocialModuleService = container.resolve(SOCIAL_MODULE)
      await socialService.deleteEventsCalendars([compensationInput.eventId])
    }
  }
)
