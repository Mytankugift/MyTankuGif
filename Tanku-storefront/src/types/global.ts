import { StorePrice } from "@medusajs/types"

export type FeaturedProduct = {
  id: string
  title: string
  handle: string
  thumbnail?: string
}

export type VariantPrice = {
  calculated_price_number: number
  calculated_price: string
  original_price_number: number
  original_price: string
  currency_code: string
  price_type: string
  percentage_diff: string
}

export type StoreFreeShippingPrice = StorePrice & {
  target_reached: boolean
  target_remaining: number
  remaining_percentage: number
}

export type TankuProductOption = {
  id: string
  title: string
  product_id: string
  values: TankuProductOptionValue[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type TankuProductOptionValue = {
  id: string
  value: string
  option_id: string
  variant_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type TankuProduct = {
  id: string
  title: string
  handle: string
  subtitle: string | null
  description: string
  is_giftcard: boolean
  status: string
  thumbnail: string
  weight: number | null
  length: number | null
  height: number | null
  width: number | null
  origin_country: string | null
  hs_code: string | null
  mid_code: string | null
  material: string | null
  discountable: boolean
  external_id: string | null
  metadata: Record<string, unknown> | null
  type_id: string | null
  type: unknown | null
  collection_id: string | null
  collection: unknown | null
  options: TankuProductOption[]
  created_at: string
  updated_at: string
  deleted_at: string | null
  variants: TankuProductVariant[]
  store: {
    id: string
    name: string
    default_sales_channel_id: string | null
    default_region_id: string | null
    default_location_id: string | null
    metadata: Record<string, unknown> | null
    created_at: string
    updated_at: string
    deleted_at: string | null
  }
}

export type TankuProductVariant = {
  id: string
  title: string
  sku: string
  barcode: string | null
  ean: string | null
  upc: string | null
  allow_backorder: boolean
  manage_inventory: boolean
  hs_code: string | null
  origin_country: string | null
  mid_code: string | null
  material: string | null
  weight: number | null
  length: number | null
  height: number | null
  width: number | null
  metadata: Record<string, unknown> | null
  variant_rank: number
  product_id: string
  product: {
    id: string
  }
  options: TankuProductOptionValue[]
  option_values: Record<string, string>
  prices: TankuVariantPrice[]
  created_at: string
  updated_at: string
  deleted_at: string | null
  inventory: TankuVariantInventory | null
}

export type TankuVariantPrice = {
  id: string
  currency_code: string
  amount: number
  min_quantity: number | null
  max_quantity: number | null
  price_list_id: string | null
  region_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type TankuVariantInventory = {
  id: string
  variant_id: string
  quantity_stock: number
  currency_code: string
  price: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}
