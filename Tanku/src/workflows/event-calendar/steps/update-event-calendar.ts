import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface UpdateEventCalendarInput {
  id: string
  event_name: string
  event_date: string
  description?: string
  event_type: string
}

export const updateEventCalendarStep = createStep(
  "update-event-calendar-step",
  async (input: UpdateEventCalendarInput, { container }) => {
    const socialService: SocialModuleService = container.resolve(SOCIAL_MODULE)
    
    // Validate required fields
    if (!input.id || !input.event_name || !input.event_date) {
      throw new Error("id, event_name y event_date son campos obligatorios")
    }

    // Get the existing event first to store original data for compensation
    const existingEvents = await socialService.listEventsCalendars({ id: input.id })
    if (!existingEvents || existingEvents.length === 0) {
      throw new Error("Evento no encontrado")
    }
    
    const originalEvent = existingEvents[0]

    // Update the event
    const updateData = {
      event_name: input.event_name,
      event_date: new Date(input.event_date),
      description: input.description || null,
      location: input.event_type || null, // Using location field to store event_type
    }

    const updatedEvent = await socialService.updateEventsCalendars({
      selector: { id: input.id },
      data: updateData
    })
    
    return new StepResponse(updatedEvent[0], {
      eventId: input.id,
      originalData: {
        event_name: originalEvent.event_name,
        event_date: originalEvent.event_date,
        description: originalEvent.description,
        location: originalEvent.location
      }
    })
  },
  async (compensationInput, { container }) => {
    if (compensationInput?.eventId && compensationInput?.originalData) {
      const socialService: SocialModuleService = container.resolve(SOCIAL_MODULE)
      await socialService.updateEventsCalendars({
        selector: { id: compensationInput.eventId },
        data: compensationInput.originalData
      })
    }
  }
)
