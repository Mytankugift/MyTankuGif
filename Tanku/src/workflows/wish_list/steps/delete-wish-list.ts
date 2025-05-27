import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISH_LIST_MODULE } from "../../../modules/wish_list";
import WishListModuleService from "../../../modules/wish_list/service";
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";


type DeleteeWishListInput = {
 list_id: string
};

const deleteWishListStep = createStep(
  "delete-wish-list-step",
  async (
    {   list_id }: DeleteeWishListInput,
    { container }
  ) => {
    const wishListModuleService: WishListModuleService = container.resolve(
        WISH_LIST_MODULE
    );

    const wishList = await wishListModuleService.deleteWishLists(list_id);

    return new StepResponse(wishList);
  }
);

export default deleteWishListStep;
