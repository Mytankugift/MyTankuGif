import { model } from "@medusajs/framework/utils";

const UserBehavior = model.define("user_behavior", {
  id: model.id().primaryKey(),
  userId: model.text(),
  actionType: model.enum(["view_product", "add_to_cart", "purchase", "wishlist", "search", "navigation"]),
  keywords: model.array(),
});

export default UserBehavior;