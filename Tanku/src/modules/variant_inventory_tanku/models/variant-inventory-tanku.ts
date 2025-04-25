import { model } from "@medusajs/framework/utils"

export const VariantInventoryTanku = model.define("variant_inventory_tanku", {
  id: model.id().primaryKey(),
  variant_id: model.text(),
  quantity_stock: model.number(),
  currency_code: model.text(),
  price: model.number(),
}).indexes([{on:["variant_id"], unique: true }])