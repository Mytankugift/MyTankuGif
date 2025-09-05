import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialModuleService from "../../../modules/social/service"

export interface DeleteEventCalendarInput {
  id: string
}

export const deleteEventCalendarStep = createStep(
  "delete-event-calendar-step",
  async (input: DeleteEventCalendarInput, { container }) => {
    const socialService: SocialModuleService = container.resolve(SOCIAL_MODULE)
    
    // Validate required fields
    if (!input.id) {
      throw new Error("id es obligatorio")
    }

    // Get the existing event first to store data for compensation
    const existingEvents = await socialService.listEventsCalendars({ id: input.id })
    if (!existingEvents || existingEvents.length === 0) {
      throw new Error("Evento no encontrado")
    }
    
    const eventToDelete = existingEvents[0]

    // Delete the event
    await socialService.deleteEventsCalendars([input.id])
    
    return new StepResponse({ success: true, deletedId: input.id }, {
      deletedEvent: eventToDelete
    })
  },
  async (compensationInput, { container }) => {
    if (compensationInput?.deletedEvent) {
      const socialService: SocialModuleService = container.resolve(SOCIAL_MODULE)
      // Recreate the deleted event
      const eventData = {
        customer_id: compensationInput.deletedEvent.customer_id,
        event_name: compensationInput.deletedEvent.event_name,
        event_date: compensationInput.deletedEvent.event_date,
        description: compensationInput.deletedEvent.description,
        location: compensationInput.deletedEvent.location
      }
      await socialService.createEventsCalendars([eventData])
    }
  }
)
