import { Module } from "@medusajs/framework/utils";
import SocialModuleService from "./service";
import { FriendshipGroupsModuleService } from "./services/friendship-groups";

export const SOCIAL_MODULE = "socialModule";
export const FRIENDSHIP_GROUPS_MODULE = "friendshipGroupsModule";

export default Module(SOCIAL_MODULE, {
  service: SocialModuleService,
});

export const FriendshipGroupsModule = Module(FRIENDSHIP_GROUPS_MODULE, {
  service: FriendshipGroupsModuleService,
});