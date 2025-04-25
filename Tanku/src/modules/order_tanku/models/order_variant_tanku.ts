import { model } from "@medusajs/framework/utils";
import OrderTanku from "./order_tanku";
import OrderStatusTanku from "./order_status_tanku";

const OrderVariantTanku = model.define("order_variant_tanku", {
  id: model.id().primaryKey(),
  variant_id: model.text(),
  quantity: model.number(),
  unit_price: model.bigNumber(),
  original_total: model.bigNumber(),
  order: model.belongsTo(() => OrderTanku, {
    mappedBy: "orderVariants",
  }),
  status: model.belongsTo(() => OrderStatusTanku, {
    mappedBy: "orderVariants",
  }),
});

export default OrderVariantTanku;
