import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISH_LIST_MODULE } from "../../../modules/wish_list";
import WishListModuleService from "../../../modules/wish_list/service";
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";


type CreateWishListInput = {
  customerId: string;
  title: string;
  state_id: "PUBLIC_ID" | "PRIVATE_ID";
};

const createWishListStep = createStep(
  "create-wish-list-step",
  async (
    {  title, state_id }: CreateWishListInput,
    { container }
  ) => {
    const wishListModuleService: WishListModuleService = container.resolve(
        WISH_LIST_MODULE
    );

    const wishList = await wishListModuleService.createWishLists(
      { title , state_id }
    );

    return new StepResponse(wishList,wishList.id);
  },
  async (wishListId: string, { container }) => {
    const wishListModuleService: WishListModuleService = container.resolve(
      WISH_LIST_MODULE
    );

    await wishListModuleService.deleteWishLists(wishListId);
  }
);

export default createWishListStep;
