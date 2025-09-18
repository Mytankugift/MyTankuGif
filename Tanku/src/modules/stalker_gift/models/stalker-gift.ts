import { model } from "@medusajs/framework/utils"

const StalkerGift = model.define("stalker_gift", {
  id: model.id().primaryKey(),
  total_amount: model.number(),
  first_name: model.text(),
  phone: model.text(),
  email: model.text(),
  alias: model.text(),
  recipient_name: model.text(),
  contact_methods: model.json(),
  products: model.json(),
  message: model.text().nullable(), // Mensaje personalizado para el destinatario
  payment_status: model.text().default("pending"), // pending, success, failed
  payment_method: model.text().default("epayco"),
  transaction_id: model.text().nullable(),
})

export default StalkerGift
