import {
  createWorkflow,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk";
import createSellerProductStep from "./steps/create-product";
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import getProductsByStoreStep from "./steps/get-products-by-store";
import createPriceSetStep from "./steps/create-price-set-step";

export type CreateSellerProductInput = {
  productData: {
    storeId: string;
    title: string;
    description: string;
    options: Array<{
      title: string;
      values: Array<string>;
    }>;
    variants: Array<{
      options: Record<string, string>;
      prices: Array<{
        amount: number;
        currency_code: string;
      }>;
      quantity: number;
      sku: string;
    }>;
  };
  thumbnail: string;
  images: Array<string>;
};

export const createSellerProductWorkflow = createWorkflow(
  "create-seller-product",
  (input: CreateSellerProductInput) => {
    const product = createSellerProductStep(input);

    // Asumiendo que createPriceSetStep devuelve un array de { variant_id, price_set_id }
    const priceSetLinks = createPriceSetStep({
      dataVariant: product.variants,
      productId: product.id,
      storeId: input.productData.storeId,
    });


    createRemoteLinkStep(priceSetLinks.dataLinks);

    return new WorkflowResponse(product);
  }
);

export type GetProductsByStoreInput = {
  storeId: string;
};

export const getProductsByStoreWorkflow = createWorkflow(
  "get-products-by-store",
  (input: GetProductsByStoreInput) => {
    const products = getProductsByStoreStep(input);
    return new WorkflowResponse(products);
  }
);
