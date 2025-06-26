import { model } from "@medusajs/framework/utils";

const UserProfile = model.define("user_profile", {
  id: model.id().primaryKey(),
  profiles: model.array(),
});

export default UserProfile;