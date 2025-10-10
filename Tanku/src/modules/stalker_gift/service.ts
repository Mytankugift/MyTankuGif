import { MedusaService } from "@medusajs/framework/utils"
import StalkerGift from "./models/stalker-gift"
import StalkerChatConversation from "./models/stalker-chat-conversation"
import StalkerChatMessage from "./models/stalker-chat-message"
import StalkerMessageStatus from "./models/stalker-message-status"

class StalkerGiftModuleService extends MedusaService({
  StalkerGift,
  StalkerChatConversation,
  StalkerChatMessage,
  StalkerMessageStatus,
}) {}

export default StalkerGiftModuleService
