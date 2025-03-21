import {
  createWorkflow,
  createStep,
  WorkflowResponse,
  StepResponse,
  when,
  transform,
} from "@medusajs/framework/workflows-sdk";
import { SELLER_REQUEST_MODULE } from "../../modules/seller_request";
import createSellerRequestStep from "./steps/create-seller-request";
import retrieveSellerRequestStep from "./steps/retrieve-seller-request";
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import retrieveListSellerRequestAdminStep from "./steps/retrieve-list-seller-request-admin";
import updateStatusSellerRequestStep from "./steps/update-status-seller-request-admin";
import createSellerStoreStep from "./steps/create-seller-store";

export type CreateSellerRequestInput = {
  dataSellerRequest: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    status_id: string;
    website: string;
    social_media: string;
    rutFile: string;
    commerceFile: string;
    idFile: string;
  };
  customerId: string;
};

export const createSellerRequestWorkflow = createWorkflow(
  "create-seller-request",
  (input: CreateSellerRequestInput) => {
    const sellerRequest = createSellerRequestStep(input);
    createRemoteLinkStep([
      {
        [SELLER_REQUEST_MODULE]: {
          seller_request_id: sellerRequest.id,
        },
        [Modules.CUSTOMER]: {
          customer_id: input.customerId,
        },
      },
    ]);

    return new WorkflowResponse(sellerRequest);
  }
);

export type RetrieveSellerRequestInput = {
  customerId: string;
};

export const retrieveSellerRequestWorkflow = createWorkflow(
  "retrieve-seller-request-workflow",
  (input: RetrieveSellerRequestInput) => {
    const sellerRequest = retrieveSellerRequestStep(input.customerId);

    return new WorkflowResponse({
      sellerRequest,
    });
  }
);

export const retrieveListSellerRequestWorkflowAdmin = createWorkflow(
  "retrieve-list-seller-request-workflow-Admin",
  () => {
    const sellerRequest = retrieveListSellerRequestAdminStep();

    return new WorkflowResponse(sellerRequest);
  }
);

export type UpdateStatusSellerRequestInput = {
  id: string;
  status_id: string;
  comment?: string;
};

export const updateStatusSellerRequestWorkflowAdmin = createWorkflow(
  "update-status-seller-request-workflow-Admin",
  (input: UpdateStatusSellerRequestInput) => {
    const sellerRequest = updateStatusSellerRequestStep(input);

    let storeData; // Declare storeData outside to access in both when statements

    when(
      "accept-seller-condition",
      input,
      (data) => data.status_id === "id_accept"
    ).then(() => {
      storeData = createSellerStoreStep(input.id);
    });

    when(
      "create-store-link",
      { storeData },
      (data) => data.storeData?.newStore?.id !== undefined
    ).then(() => {
      if (storeData?.linkDefinition) {
        return createRemoteLinkStep([storeData.linkDefinition]);
      }
    });

    return new WorkflowResponse(sellerRequest);
  }
);
