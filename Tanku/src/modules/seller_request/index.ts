import { Module } from "@medusajs/framework/utils";
import SellerRequestModuleService from "./service";

export const SELLER_REQUEST_MODULE = "sellerRequestModuleService";

export default Module(SELLER_REQUEST_MODULE, {
  service: SellerRequestModuleService,
});
