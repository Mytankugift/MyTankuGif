import { Module } from "@medusajs/framework/utils";
import SocialModuleService from "./service";

export const SOCIAL_MODULE = "socialModule";

export default Module(SOCIAL_MODULE, {
  service: SocialModuleService,
});

