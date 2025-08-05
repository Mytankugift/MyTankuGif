import { model } from "@medusajs/framework/utils"

export const EventsCalendar = model.define("events_calendar", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  event_name: model.text(),
  event_date: model.dateTime(),
  description: model.text().nullable(),
  location: model.text().nullable(),
}).indexes([
  { on: ["customer_id"] },
  { on: ["event_date"] },
  { on: ["customer_id", "event_date"] }
])