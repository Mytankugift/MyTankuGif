import { defineLink } from "@medusajs/framework/utils";
import OrderTankuModule from "../modules/order_tanku";
import CustomerModule from "@medusajs/medusa/customer";

export default defineLink(CustomerModule.linkable.customer, {
  linkable: OrderTankuModule.linkable.orderTanku,
  isList: true,
});
