import { Module } from "@medusajs/framework/utils"
import StalkerGiftService from "./service"

export const STALKER_GIFT_MODULE = "stalkerGiftModuleService"

export default Module(STALKER_GIFT_MODULE, {
  service: StalkerGiftService,
})
