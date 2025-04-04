import { defineLink } from "@medusajs/framework/utils";
import StoreModule from "@medusajs/medusa/store";
import ProductModule from "@medusajs/medusa/product";

export default defineLink(
  StoreModule.linkable.store,
  {linkable: ProductModule.linkable.product,
    isList: true
  }
);
