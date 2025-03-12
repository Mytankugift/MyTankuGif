import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { SELLER_REQUEST_MODULE } from "../../../modules/seller_request";

const retrieveListSellerRequestAdminStep = createStep(
  "retrieve-list-seller-request-admin-step",
  async (_, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    try {
      const { data } = await query.graph({
        entity: "seller_request",
        fields: ["*"],
      });

      const sellerRequests = data || [];

      return new StepResponse(sellerRequests);
    } catch (error) {
      console.error("Error retrieving seller request", error);
      throw error; // Re-lanzamos el error para que pueda ser manejado por el workflow
    }
  }
);

export default retrieveListSellerRequestAdminStep;
