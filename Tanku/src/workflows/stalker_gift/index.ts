import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createStalkerGiftStep } from "./steps/create-stalker-gift"
import { listStalkerGiftsStep } from "./steps/list-stalker-gifts"
import { getStalkerGiftStep } from "./steps/get-stalker-gift"
import { updatePaymentStatusStep } from "./steps/update-payment-status"
import { updateStalkerGiftOrderStep } from "./steps/update-stalker-gift-order"
import { getCustomerStalkerGiftsStep } from "./steps/get-customer-stalker-gifts"

export interface CreateStalkerGiftWorkflowInput {
  total_amount: number
  first_name: string
  phone: string
  email: string
  alias: string
  recipient_name: string
  contact_methods: any[]
  products: any[]
  message?: string
  customer_giver_id?: string
  customer_recipient_id?: string
  payment_method?: string
  payment_status?: string
}

export interface ListStalkerGiftsWorkflowInput {
  customerId?: string
  limit?: number
  offset?: number
}

export interface GetStalkerGiftWorkflowInput {
  id: string
}

export interface UpdatePaymentStatusWorkflowInput {
  id: string
  payment_status: "pending" | "success" | "failed"
  transaction_id?: string
}

export interface UpdateStalkerGiftWorkflowInput {
  stalker_gift_id: string
  customer_id: string
  customer_recipient_id?: string
  payment_status?: string
}

export interface GetCustomerStalkerGiftsWorkflowInput {
  customer_id: string
}

export const createStalkerGiftWorkflow = createWorkflow(
  "create-stalker-gift",
  (input: CreateStalkerGiftWorkflowInput) => {
    const stalkerGift = createStalkerGiftStep(input)

    return new WorkflowResponse(stalkerGift)
  }
)

export const listStalkerGiftsWorkflow = createWorkflow(
  "list-stalker-gifts",
  (input: ListStalkerGiftsWorkflowInput) => {
    const stalkerGifts = listStalkerGiftsStep(input)

    return new WorkflowResponse(stalkerGifts)
  }
)

export const getStalkerGiftWorkflow = createWorkflow(
  "get-stalker-gift",
  (input: GetStalkerGiftWorkflowInput) => {
    const stalkerGift = getStalkerGiftStep(input)

    return new WorkflowResponse(stalkerGift)
  }
)

export const updatePaymentStatusWorkflow = createWorkflow(
  "update-payment-status",
  (input: UpdatePaymentStatusWorkflowInput) => {
    const stalkerGift = updatePaymentStatusStep(input)

    return new WorkflowResponse(stalkerGift)
  }
)

export const updateStalkerGiftWorkflow = createWorkflow(
  "update-stalker-gift",
  (input: UpdateStalkerGiftWorkflowInput) => {
    const stalkerGift = updateStalkerGiftOrderStep(input)

    return new WorkflowResponse(stalkerGift)
  }
)

export const getCustomerStalkerGiftsWorkflow = createWorkflow(
  "get-customer-stalker-gifts",
  (input: GetCustomerStalkerGiftsWorkflowInput) => {
    const stalkerGifts = getCustomerStalkerGiftsStep(input)

    return new WorkflowResponse(stalkerGifts)
  }
)
