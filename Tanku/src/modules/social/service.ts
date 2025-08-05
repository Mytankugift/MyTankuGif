import { MedusaService } from "@medusajs/framework/utils"
import { FriendRequest } from "./models/friend-request"
import { Friend } from "./models/friend"
import { FriendInGroup } from "./models/friend-in-group"
import { FriendshipGroups } from "./models/friendship-groups"
import { Poster } from "./models/poster"
import { StoryFile } from "./models/story-file"
import { StoriesUser } from "./models/stories-user"

class SocialModuleService extends MedusaService({
  FriendRequest,
  Friend,
  FriendInGroup,
  FriendshipGroups,
  Poster,
  StoryFile,
  StoriesUser,
}) {
  // Puedes añadir métodos personalizados aquí si es necesario
}

export default SocialModuleService