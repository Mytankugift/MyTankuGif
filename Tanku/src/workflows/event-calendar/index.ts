import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { createEventCalendarStep, CreateEventCalendarInput } from "./steps/create-event-calendar";
import { getUserEventsStep, GetUserEventsInput } from "./steps/get-user-events";
import { updateEventCalendarStep, UpdateEventCalendarInput } from "./steps/update-event-calendar";
import { deleteEventCalendarStep, DeleteEventCalendarInput } from "./steps/delete-event-calendar";

export const createEventCalendarWorkflow = createWorkflow(
  "create-event-calendar-workflow",
  (input: CreateEventCalendarInput) => {
    
    const eventResult = createEventCalendarStep(input);

    return new WorkflowResponse(eventResult);
  }
);

export const getUserEventsWorkflow = createWorkflow(
  "get-user-events-workflow",
  (input: GetUserEventsInput) => {
    
    const eventsResult = getUserEventsStep(input);

    return new WorkflowResponse(eventsResult);
  }
);

export const updateEventCalendarWorkflow = createWorkflow(
  "update-event-calendar-workflow",
  (input: UpdateEventCalendarInput) => {
    
    const eventResult = updateEventCalendarStep(input);

    return new WorkflowResponse(eventResult);
  }
);

export const deleteEventCalendarWorkflow = createWorkflow(
  "delete-event-calendar-workflow",
  (input: DeleteEventCalendarInput) => {
    
    const deleteResult = deleteEventCalendarStep(input);

    return new WorkflowResponse(deleteResult);
  }
);
