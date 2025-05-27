import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import WishListModule from "../modules/wish_list"; // Asegúrate de importar correctamente tu módulo

export default defineLink(
  {
    linkable: WishListModule.linkable.wishList,
    isList: true,
  },
  {
    linkable: ProductModule.linkable.product,
    isList: true,
  }
)