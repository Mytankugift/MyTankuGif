import { defineLink } from "@medusajs/framework/utils";
import CustomerModule from "@medusajs/medusa/customer";
import WishListModule from "../modules/wish_list"; // Asegúrate de importar tu módulo correctamente

export default defineLink(
  CustomerModule.linkable.customer,
  {
    linkable: WishListModule.linkable.wishList,
    isList: true,
  }
);