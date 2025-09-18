import { MedusaService } from "@medusajs/framework/utils"
import StalkerGift from "./models/stalker-gift"

class StalkerGiftModuleService extends MedusaService({
  StalkerGift,
}) {}

export default StalkerGiftModuleService
