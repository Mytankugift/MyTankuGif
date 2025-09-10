import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ORDER_TANKU_MODULE } from "../../../modules/order_tanku"
import OrderTankuModuleService from "../../../modules/order_tanku/service"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export interface GetSellerOrdersInput {
  store_id: string
}

export const getSellerOrdersStep = createStep(
  "get-seller-orders-step",
  async (input: GetSellerOrdersInput, { container }) => {
    const orderTankuService: OrderTankuModuleService = container.resolve(ORDER_TANKU_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    
    // Validate required fields
    if (!input.store_id) {
      throw new Error("store_id es obligatorio")
    }

    try {
      // First, get all products linked to this store
      const { data: storeProducts } = await query.graph({
        entity: "store",
        fields: [
          "products.id",
          "products.variants.id"
        ],
        filters: {
          id: input.store_id
        },
      })

      if (!storeProducts || storeProducts.length === 0 || !storeProducts[0].products) {
        return new StepResponse([], null)
      }

      // Extract all variant IDs from store products
      const variantIds: string[] = []
      storeProducts[0].products.forEach((product: any) => {
        if (product.variants) {
          product.variants.forEach((variant: any) => {
            variantIds.push(variant.id)
          })
        }
      })

      if (variantIds.length === 0) {
        return new StepResponse([], null)
      }

      // Get all orders that contain variants from this store
      const allOrders = await orderTankuService.listOrderTankus({}, {
        relations: ["status", "shipping_address", "orderVariants"],
        order: { created_at: "DESC" }
      })

      // Filter orders that contain products from this store
      const sellerOrders = allOrders.filter(order => {
        return order.orderVariants && order.orderVariants.some(variant => 
          variantIds.includes(variant.variant_id)
        )
      })

      // For each order, filter only the variants that belong to this store
      const filteredOrders = sellerOrders.map(order => ({
        ...order,
        orderVariants: order.orderVariants.filter(variant => 
          variantIds.includes(variant.variant_id)
        )
      }))

      return new StepResponse(filteredOrders, null)
    } catch (error) {
      console.error("Error obteniendo órdenes del vendedor:", error)
      return new StepResponse([], null)
    }
  }
)
