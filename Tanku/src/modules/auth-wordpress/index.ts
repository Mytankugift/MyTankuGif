import { Module } from "@medusajs/framework/utils";
import AuthWordpressService from "./service";

export const AUTH_WORDPRESS_MODULE = "authWordpressModule";

export default Module(AUTH_WORDPRESS_MODULE, {
  service: AuthWordpressService,
  
});
