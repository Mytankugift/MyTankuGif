import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { SELLER_REQUEST_MODULE } from "../../../modules/seller_request";

const retrieveSellerRequestStep = createStep(
  "retrieve-seller-request-step",
  async (customerId: string, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    try {
      const { data: customerData } = await query.graph({
        entity: "customer",
        fields: ["*", "seller_request.*", "store.*"],
        filters: {
          id: customerId,
        },
      });

      const sellerRequests = customerData[0]?.seller_request || {};
      return new StepResponse({ ...sellerRequests, store: customerData[0]?.store?.id || null });
    } catch (error) {
      console.error("Error retrieving seller request", error);
      throw error; // Re-lanzamos el error para que pueda ser manejado por el workflow
    }
  }
);

export default retrieveSellerRequestStep;
