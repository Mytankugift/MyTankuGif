import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import getProductsStep from "./steps/get-products";
import getProductByHandleStep from "./steps/get-product";

export const getProductsWorkflow = createWorkflow(
  "get-products",()=>{
  const listProducts = getProductsStep()
  return new WorkflowResponse(listProducts) ;
}
);

export type GetProductsByHandleInput = {
  handle: string
}

export const getProductByHandleWorkflow = createWorkflow(
  "get-product-by-handle-tanku",
  (input: GetProductsByHandleInput) => {
    const product = getProductByHandleStep({ handle: input.handle })
    return new WorkflowResponse(product)
  }
)
