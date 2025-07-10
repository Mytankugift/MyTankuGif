import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISH_LIST_MODULE } from "../../../modules/wish_list";
import WishListModuleService from "../../../modules/wish_list/service";
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";


type CreateWishListInput = {
  title: string;
  state_id: boolean
  email: string;
};

const createWishListStep = createStep(
  "create-wish-list-step",
  async (
    {  title, state_id, email }: CreateWishListInput,
    { container }
  ) => {
    const customerService = container.resolve(Modules.CUSTOMER)

    const customer = await customerService.listCustomers();

    const customerId = customer.find((customer: any) => customer.email === email)?.id;
    const wishListModuleService: WishListModuleService = container.resolve(
        WISH_LIST_MODULE
    );

    const wishList = await wishListModuleService.createWishLists(
      { title , state_id: state_id ? "PUBLIC_ID" : "PRIVATE_ID" }
    );

    return new StepResponse({wishList, customerId},wishList.id);
  },
  async (wishListId: string, { container }) => {
    const wishListModuleService: WishListModuleService = container.resolve(
      WISH_LIST_MODULE
    );

    await wishListModuleService.deleteWishLists(wishListId);
  }
);

export default createWishListStep;
