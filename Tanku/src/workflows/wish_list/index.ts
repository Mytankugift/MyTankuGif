import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import createWishListStep from "./steps/create-wish-list";
import { Modules } from "@medusajs/framework/utils";
import { WISH_LIST_MODULE } from "../../modules/wish_list";
import { createRemoteLinkStep, dismissRemoteLinkStep } from "@medusajs/medusa/core-flows";
import getListWishListStep from "./steps/get-list-wish-list";
import deleteWishListStep from "./steps/delete-wish-list";
import getListWishListWordpressStep from "./steps/get-list-wish-wordpress";
import addWishListWordpressStep from "./steps/create-wish-list-wordpress";

type CreateWishListInput = {
  customerId: string;
  title: string;
  state_id: "PUBLIC_ID" | "PRIVATE_ID";
}

export const createWishListWorkflow = createWorkflow(
  "create-wish-list", ( input: CreateWishListInput) => {
    const wishList = createWishListStep({title: input.title, customerId: input.customerId, state_id: input.state_id})


    createRemoteLinkStep([
          {
            [Modules.CUSTOMER]: {  
              customer_id: input.customerId,
            },
            [WISH_LIST_MODULE]: {
              wish_list_id: wishList.id,   
            },
          },
        ]);
    return new WorkflowResponse(wishList)
  }
);

export const getListWishListWorkflow = createWorkflow(
  "get-list-wish-list", ( input: {customerId: string}) => {
    const wishList = getListWishListStep({customerId: input.customerId})
    return new WorkflowResponse(wishList)
  }
);

export const addProductToWishListWorkflow = createWorkflow(
  "add-product-to-wish-list", ( input: {productId: string, wishListId: string}) => {
   const remoteLink = createRemoteLinkStep([
        {
          [WISH_LIST_MODULE]: { wish_list_id: input.wishListId },
          [Modules.PRODUCT]: { product_id: input.productId },
        },
      ])
    return new WorkflowResponse(remoteLink)
  }
);

export const deleteProductToWishListWorkflow = createWorkflow(
  "delete-product-to-wish-list", ( input: {productId: string, wishListId: string}) => {
   const remoteLink = dismissRemoteLinkStep([
        {
          [WISH_LIST_MODULE]: { wish_list_id: input.wishListId },
          [Modules.PRODUCT]: { product_id: input.productId },
        },
      ])
    return new WorkflowResponse(remoteLink)
  }
);  

export const deleteWishListWorkflow = createWorkflow(
  "delete-wish-list", ( input: {list_id: string}) => {
    const wishList = deleteWishListStep({list_id: input.list_id})
    return new WorkflowResponse(wishList)
  }
);

export const getListWishListWordpressWorkflow = createWorkflow(
  "get-list-wish-list-wordpress", ( input: {email: string}) => {
    const wishList = getListWishListWordpressStep({email: input.email})
    return new WorkflowResponse(wishList)
  }
)

export const addWishListWordpressWorkflow = createWorkflow(
  "add-wish-list-wordpress", ( input: {email: string, title: string, publico: boolean}) => {
    const wishList = addWishListWordpressStep({email: input.email, title: input.title, state_id: input.publico})
    createRemoteLinkStep([
      {
        [Modules.CUSTOMER]: {  
          customer_id: wishList.customerId,
        },
        [WISH_LIST_MODULE]: {
          wish_list_id: wishList.wishList.id,   
        },
      },
    ]);
    return new WorkflowResponse(wishList)
  }
);


