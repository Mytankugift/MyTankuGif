import { defineLink } from "@medusajs/framework/utils";
import SellerRequestModule from "../modules/seller_request";
import CustomerModule from "@medusajs/medusa/customer";

export default defineLink(
  SellerRequestModule.linkable.sellerRequest,
  CustomerModule.linkable.customer
);
