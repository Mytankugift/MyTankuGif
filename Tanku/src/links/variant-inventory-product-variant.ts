import { defineLink } from "@medusajs/framework/utils"
import VariantInventoryTankuModule from "../modules/variant_inventory_tanku"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  {
    linkable: ProductModule.linkable.productVariant,
    field: "id",
  },
  {
    ...VariantInventoryTankuModule.linkable.variantInventoryTanku.id,
    primaryKey: "variant_id",
  },
  {
    readOnly: true,
  }
)