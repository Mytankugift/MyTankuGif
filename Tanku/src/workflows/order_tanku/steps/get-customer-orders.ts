// import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
// import { ORDER_TANKU_MODULE } from "../../../modules/order_tanku"
// import OrderTankuModuleService from "../../../modules/order_tanku/service"

// export interface GetCustomerOrdersInput {
//   customer_id: string
// }

// export const getCustomerOrdersStep = createStep(
//   "get-customer-orders-step",
//   async (input: GetCustomerOrdersInput, { container }) => {
//     const orderTankuService: OrderTankuModuleService = container.resolve(ORDER_TANKU_MODULE)
    
//     // Validate required fields
//     if (!input.customer_id) {
//       throw new Error("customer_id es obligatorio")
//     }

//     // For now, get all orders with relations and let the frontend handle filtering
//     // In a production environment, you would implement proper customer-order linking
//     const orders = await orderTankuService.listOrderTankus({id:[""]}, {
//       relations: ["status", "shipping_address", "orderVariants"],
//       order: { created_at: "DESC" }
//     })
    
//     return new StepResponse(orders || [], null)
//   }
// )

import CustomerOrderTankuLink from "../../../links/order-customer"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_TANKU_MODULE } from "../../../modules/order_tanku"
import OrderTankuModuleService from "../../../modules/order_tanku/service"

export interface GetCustomerOrdersInput {
  customer_id: string
}

export const getCustomerOrdersStep = createStep(
  "get-customer-orders-step",
  async (input: GetCustomerOrdersInput, { container }) => {
    if (!input.customer_id) {
      throw new Error("customer_id es obligatorio")
    }
    const orderTankuService: OrderTankuModuleService = container.resolve(ORDER_TANKU_MODULE)

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: ordersCustomer } = await query.graph({
      entity: CustomerOrderTankuLink.entryPoint,
      fields: [
        "*",
        "order_tanku.*",
        "customer.*",
      ],
      filters: {
        customer_id: input.customer_id
      },
      pagination: {
        order: {
          created_at: "DESC"
        }
      }
    })

    const ordersIds = ordersCustomer.map((order) => order.order_tanku_id)

    const orders = await orderTankuService.listOrderTankus({id:ordersIds}, {
      relations: ["status", "shipping_address", "orderVariants"],
      order: { created_at: "DESC" }
    })

    return new StepResponse(orders || [], null)
  }
)
