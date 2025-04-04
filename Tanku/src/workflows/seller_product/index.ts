import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import createSellerProductStep from "./steps/create-product";
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";

export type CreateSellerProductInput = {
  productData: {
    storeId: string
    title: string,
    description: string,
    options: Array<{
      title: string,
      values: Array<string>
    }>,
    variants: Array<{
      options: Record<string, string>,
      prices: Array<{
        amount: number,
        currency_code: string
      }>,
      quantity: number,
      sku: string
    }>
  }
  thumbnail: string,
  images: Array<string>,
};

export const createSellerProductWorkflow = createWorkflow(
  "create-seller-product",
  (input: CreateSellerProductInput) => {
    const product = createSellerProductStep(input);
    createRemoteLinkStep([
      {
        [Modules.STORE]: {
          store_id: input.productData.storeId,
        },
        [Modules.PRODUCT]: {
          product_id: product.id,
        },
      },
    ]);
    return new WorkflowResponse(product);
  }
);
