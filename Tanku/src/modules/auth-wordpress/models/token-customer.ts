import { model } from "@medusajs/framework/utils";

const CustomerToken = model.define("customer_token", {
  id: model.id().primaryKey(),
  token: model.text(),
});

export default CustomerToken;