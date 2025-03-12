import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { SELLER_REQUEST_MODULE } from "../../../modules/seller_request";
import SellerRequestModuleService from "../../../modules/seller_request/service";
import { UpdateStatusSellerRequestInput } from "..";

export const updateStatusSellerRequestStep = createStep(
  "update-status-seller-request-admin",
  async (
    { id, status_id, comment }: UpdateStatusSellerRequestInput,
    { container }
  ) => {
    const sellerRequestService: SellerRequestModuleService = container.resolve(
      SELLER_REQUEST_MODULE
    );

    const prevStatusId = await sellerRequestService
      .retrieveSellerRequest(id)
      .then((req) => ({ status_id: req.status_id, comment: req.status_id }));

    let updateData: Partial<UpdateStatusSellerRequestInput> = { id, status_id };

    if (status_id === "id_correction" || status_id === "id_reject") {
      updateData.comment = comment;
    }

    const updatedSellerRequest =
      await sellerRequestService.updateSellerRequests(updateData);

    return new StepResponse(updatedSellerRequest, {
      id,
      ...prevStatusId,
    });
  },
  async (prevData: UpdateStatusSellerRequestInput, { container }) => {
    const sellerRequestService: SellerRequestModuleService = container.resolve(
      SELLER_REQUEST_MODULE
    );

    await sellerRequestService.updateSellerRequests(prevData);
  }
);

export default updateStatusSellerRequestStep;
