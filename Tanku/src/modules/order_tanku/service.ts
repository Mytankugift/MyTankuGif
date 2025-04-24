import { MedusaService } from "@medusajs/framework/utils";
import OrderTanku from "./models/order_tanku";
import OrderVariantTanku from "./models/order_variant_tanku";
import OrderStatusTanku from "./models/order_status_tanku";
import ShippingAddressTanku from "./models/shipping_address_tanku";
class OrderTankuModuleService extends MedusaService({
  OrderTanku,
  OrderVariantTanku,
  OrderStatusTanku,
  ShippingAddressTanku,
}) {
 
}

export default OrderTankuModuleService;
