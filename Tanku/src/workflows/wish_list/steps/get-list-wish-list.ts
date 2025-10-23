import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISH_LIST_MODULE } from "../../../modules/wish_list";
import WishListModuleService from "../../../modules/wish_list/service";
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";


type getListWishListInput = {
  customerId: string;
};

const getListWishListStep = createStep(
  "get-list-wish-list-step",
  async (
    {  customerId }: getListWishListInput,
    { container }
  ) => {
    
    const wishListModuleService: WishListModuleService = container.resolve(
        WISH_LIST_MODULE
    );
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { data: customers } = await query.graph({
          entity: "customer",
          fields: [
            "wish_lists.*",
            "wish_lists.products.*",
            "wish_lists.products.variants.*",
            "wish_lists.products.variants.inventory.*"
          ],
          filters: {
            id: customerId,
          },
        });

        if (!customers || customers.length === 0) {
          return new StepResponse([])
        }

        const wishlist = customers[0]?.wish_lists || []
        const wishlistFiltered = wishlist?.filter((list: any) => list) || []
        
    return new StepResponse(wishlistFiltered);
  },

);

export default getListWishListStep;
