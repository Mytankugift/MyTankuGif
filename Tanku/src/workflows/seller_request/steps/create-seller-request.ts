import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { SELLER_REQUEST_MODULE } from "../../../modules/seller_request";
import SellerRequestModuleService from "../../../modules/seller_request/service";
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { CreateSellerRequestInput } from "..";

const createSellerRequestStep = createStep(
  "create-seller-request-step",
  async (
    { dataSellerRequest, customerId }: CreateSellerRequestInput,
    { container }
  ) => {
    const sellerModuleService: SellerRequestModuleService = container.resolve(
      SELLER_REQUEST_MODULE
    );

    const sellerRequest = await sellerModuleService.createSellerRequests(
      dataSellerRequest
    );

    return new StepResponse(sellerRequest, sellerRequest.id);
  },
  async (sellerRequestId: string, { container }) => {
    const sellerModuleService: SellerRequestModuleService = container.resolve(
      SELLER_REQUEST_MODULE
    );

    await sellerModuleService.deleteSellerRequests(sellerRequestId);
  }
);

export default createSellerRequestStep;
