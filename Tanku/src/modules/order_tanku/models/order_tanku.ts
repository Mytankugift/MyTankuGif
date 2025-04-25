import { model } from "@medusajs/framework/utils";
import OrderStatusTanku from "./order_status_tanku";
import ShippingAddressTanku from "./shipping_address_tanku";
import OrderVariantTanku from "./order_variant_tanku";

const OrderTanku = model.define("order_tanku", {
  id: model.id().primaryKey(),
  cart_id: model.text(),
  email: model.text(),
  payment_method: model.text(),
  total_amount: model.number(),
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
  status: model.belongsTo(() => OrderStatusTanku, {
    mappedBy: "orders",
  }),
  shipping_address: model.belongsTo(() => ShippingAddressTanku, {
    mappedBy: "orders",
  }),
  orderVariants: model.hasMany(() => OrderVariantTanku, {
    mappedBy: "order",
  }),
});

export default OrderTanku;
