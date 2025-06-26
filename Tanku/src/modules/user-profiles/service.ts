import { MedusaService } from "@medusajs/framework/utils";
import UserProfile from "./models/user_profiles";
import UserBehavior from "./models/user_behavior";

class UserProfileModuleService extends MedusaService({
  UserProfile,
  UserBehavior,
}) {}

export default UserProfileModuleService;
