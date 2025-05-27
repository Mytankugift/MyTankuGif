import { Module } from "@medusajs/framework/utils";
import WishListModuleService from "./service";

export const WISH_LIST_MODULE = "wishListModule";

export default Module(WISH_LIST_MODULE, {
  service: WishListModuleService,
});
