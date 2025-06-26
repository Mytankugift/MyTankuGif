import { defineLink } from "@medusajs/framework/utils";
import UserBehaviorModule from "../modules/user-profiles";
import CustomerModule from "@medusajs/medusa/customer";

export default defineLink(CustomerModule.linkable.customer, {
  linkable: UserBehaviorModule.linkable.userBehavior,
  isList: true,
});
