import { model } from "@medusajs/framework/utils";

const SocketConnection = model.define("socket_connection", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  socket_id: model.text(),
  connected_at: model.dateTime(),
  disconnected_at: model.dateTime().nullable(),
  is_active: model.boolean().default(true),
});

export default SocketConnection;
