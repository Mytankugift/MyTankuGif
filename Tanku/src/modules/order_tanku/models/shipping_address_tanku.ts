import { model } from "@medusajs/framework/utils";
import OrderTanku from "./order_tanku";

const ShippingAddressTanku = model.define("shipping_address_tanku", {
  id: model.id().primaryKey(),
  first_name: model.text(),
  last_name: model.text(),
  address_1: model.text(),
  address_2: model.text().nullable(),
  company: model.text().nullable(),
  postal_code: model.text(),
  city: model.text(),
  country_code: model.text(),
  province: model.text(),
  phone: model.text(),
  orders: model.hasMany(() => OrderTanku, {
    mappedBy: "shipping_address",
  }),
});

export default ShippingAddressTanku;
