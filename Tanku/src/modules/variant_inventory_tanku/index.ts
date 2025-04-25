import { Module } from "@medusajs/framework/utils";
import VariantInventoryTankuModuleService from "./service";

export const VARIANT_INVENTORY_TANKU_MODULE = "variantInventoryTankuModuleService";

export default Module(VARIANT_INVENTORY_TANKU_MODULE, {
  service: VariantInventoryTankuModuleService,
});