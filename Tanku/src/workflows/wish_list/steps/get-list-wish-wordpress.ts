import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISH_LIST_MODULE } from "../../../modules/wish_list";
import WishListModuleService from "../../../modules/wish_list/service";
import {
  createWorkflow,
  WorkflowResponse,
  
} from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";



type getListWishListInput = {
  email: string;
};

const getListWishListWordpressStep = createStep(
  "get-list-wish-list-wordpress-step",
  async (
    {  email }: getListWishListInput,
    { container }
  ) => {
    
    const wishListModuleService: WishListModuleService = container.resolve(
        WISH_LIST_MODULE
    );
  
    
     const customerService = container.resolve(Modules.CUSTOMER)

    const customer = await customerService.listCustomers();

    const customerId = customer.find((customer: any) => customer.email === email)?.id;

    if (!customerId) {
      return new StepResponse([]);
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { data: wishLists } = await query.graph({
          entity: "customer",
          fields: [
            "wish_lists.*",
            "wish_lists.products.*"
          ],
          filters: {
            id: customerId,
          },
        });

        const wishlist = wishLists[0].wish_lists
    console.log("wishLists",wishlist)

        const wishlistFiltered = wishlist?.filter((list: any) => list)
        console.log("wishlistFiltered",wishlistFiltered)
    return new StepResponse(wishlistFiltered);
  },

);

export default getListWishListWordpressStep;
