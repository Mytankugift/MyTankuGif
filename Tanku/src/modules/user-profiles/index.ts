import { Module } from "@medusajs/framework/utils";
import UserProfileModuleService from "./service";

export const USER_PROFILE_MODULE = "userProfileModule";

export default Module(USER_PROFILE_MODULE, {
  service: UserProfileModuleService,
});
