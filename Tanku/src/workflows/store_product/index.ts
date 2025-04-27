import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import getProductsStep from "./steps/get-products";
import getProductByHandleStep from "./steps/get-product";

// Definimos interfaces genéricas para simplificar los tipos
type ProductResponse = any;
type ProductByHandleResponse = any;

export const getProductsWorkflow = createWorkflow(
  "get-products", () => {
    // Usamos una anotación de tipo genérico para evitar que TypeScript intente inferir
    // tipos demasiado complejos que causan el error de profundidad de pila
    const listProducts: ProductResponse = getProductsStep()
    return new WorkflowResponse(listProducts)
  }
);

export type GetProductsByHandleInput = {
  handle: string
}

export const getProductByHandleWorkflow = createWorkflow(
  "get-product-by-handle-tanku",
  (input: GetProductsByHandleInput) => {
    // Usamos una anotación de tipo genérico para evitar problemas de inferencia de tipos
    const product: ProductByHandleResponse = getProductByHandleStep({ handle: input.handle })
    return new WorkflowResponse(product)
  }
)
