import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform,
} from "@medusajs/framework/workflows-sdk";
import { ORDER_TANKU_MODULE } from "../../modules/order_tanku";
import createOrderStep from "./steps/create-order";

import { createRemoteLinkStep } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import createOrderVariantStep from "./steps/create-orderVariant";
import { getCustomerOrdersStep, GetCustomerOrdersInput } from "./steps/get-customer-orders";
import { getSellerStoreStep, GetSellerStoreInput } from "./steps/get-seller-store";
import { getSellerOrdersStep, GetSellerOrdersInput } from "./steps/get-seller-orders";

export type OrderVariantData = {
  variant_id: string;
  quantity: number;
  unit_price: number;
  original_total: number;
};

export type OrderData = {
  cart_id: string;
  email: string;
  payment_method: string;
  total_amount: number;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  company?: string;
  postal_code: string;
  city: string;
  country_code: string;
  province: string;
  phone: string;
  shipping_address_id?: string;
};

export type CreateOrderInput = {
  orderData: OrderData;
  orderVariantsData: OrderVariantData[];
  customerId: string;
};

export const createOrderTankuWorkflow = createWorkflow(
  "create-order-tanku-workflow",
  (input: CreateOrderInput) => {
  
    const orderResult = createOrderStep(input);
    
    
    createRemoteLinkStep([
      {
        [Modules.CUSTOMER]: {  // Usa el nombre del módulo, no el servicio
          customer_id: input.customerId,
        },
        [ORDER_TANKU_MODULE]: {
          order_tanku_id: orderResult.id,  // Usa el nombre que coincide con tu definición linkable
        },
      },
    ]);

    return new WorkflowResponse(orderResult);
  }
);

export type UpdateOrderStatusInput = {
  orderId: string;
  statusName: string;
};

export const getCustomerOrdersWorkflow = createWorkflow(
  "get-customer-orders-workflow",
  (input: GetCustomerOrdersInput) => {
    
    const ordersResult = getCustomerOrdersStep(input);

    return new WorkflowResponse(ordersResult);
  }
);

export const getSellerOrdersWorkflow = createWorkflow(
  "get-seller-orders-workflow",
  (input: GetSellerStoreInput) => {
    
    // First get the seller's store
    const storeResult = getSellerStoreStep(input);
    
    // Then get orders filtered by store products
    const ordersResult = getSellerOrdersStep({
      store_id: storeResult.id
    });

    return new WorkflowResponse(ordersResult);
  }
);

// export const updateOrderStatusTankuWorkflow = createWorkflow(
//   "update-order-status-tanku-workflow",
//   (input: UpdateOrderStatusInput) => {
//     const result = updateOrderStatusStep(input);
    
//     return new WorkflowResponse(result);
//   }
// );
