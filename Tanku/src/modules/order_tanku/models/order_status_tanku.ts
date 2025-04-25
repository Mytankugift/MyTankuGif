import { model } from "@medusajs/framework/utils";
import OrderTanku from "./order_tanku";
import OrderVariantTanku from "./order_variant_tanku";

const OrderStatusTanku = model.define("order_status_tanku", {
  id: model.id().primaryKey(),
  status: model.enum(["pendiente", "procesando", "enviado", "entregado", "cancelado"]),
  orders: model.hasMany(() => OrderTanku, {
    mappedBy: "status",
  }),
  orderVariants: model.hasMany(() => OrderVariantTanku, {
    mappedBy: "status",
  }),
});

export default OrderStatusTanku;
