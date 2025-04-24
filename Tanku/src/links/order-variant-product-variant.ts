
import { defineLink } from "@medusajs/framework/utils"
import OrderTankuModule from "../modules/order_tanku" 
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  {
    linkable: ProductModule.linkable.productVariant,
    isList: true,
  },
  OrderTankuModule.linkable.orderVariantTanku
)