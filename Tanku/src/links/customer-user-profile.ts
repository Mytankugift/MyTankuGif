import { defineLink } from "@medusajs/framework/utils";
import UserProfileModule from "../modules/user-profiles";
import CustomerModule from "@medusajs/medusa/customer";

export default defineLink(
  CustomerModule.linkable.customer,
  UserProfileModule.linkable.userProfile
);
