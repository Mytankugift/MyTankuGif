import { model } from "@medusajs/framework/utils";

const CustomerToken = model.define("customer_token", {
  id: model.id().primaryKey(),
  token: model.text(),
  id_customer_wordpress: model.text(),
  email: model.text(),
});

export default CustomerToken;