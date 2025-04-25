import { Module } from "@medusajs/framework/utils";
import OrderTankuModuleService from "./service";

export const ORDER_TANKU_MODULE = "orderTankuModuleService";

export default Module(ORDER_TANKU_MODULE, {
  service: OrderTankuModuleService,
  
});
