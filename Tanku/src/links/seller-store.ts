import { defineLink } from "@medusajs/framework/utils";
import StoreModule from "@medusajs/medusa/store";
import CustomerModule from "@medusajs/medusa/customer";

export default defineLink(
  StoreModule.linkable.store,
  CustomerModule.linkable.customer
);
