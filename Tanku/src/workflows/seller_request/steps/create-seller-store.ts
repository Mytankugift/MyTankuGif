import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { SELLER_REQUEST_MODULE } from "../../../modules/seller_request";
import { Module } from "@medusajs/framework/utils";
import SellerRequestModuleService from "../../../modules/seller_request/service";
import { UpdateStatusSellerRequestInput } from "..";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { ICustomerModuleService } from "@medusajs/framework/types";
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows";

const createSellerStoreStep = createStep(
  "create-seller-store-step",
  async (sellerRequestId: string, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const StoreModuleService = container.resolve(Modules.STORE);

    const { data: sellerRequest } = await query.graph({
      entity: "seller_request",
      fields: ["*", "customer.*"],
      filters: {
        id: sellerRequestId,
      },
    });

    const dataCustomer = sellerRequest[0].customer;

    const { data: customersStore } = await query.graph({
      entity: "customer",
      fields: ["*", "store.*"],
      filters: {
        id: dataCustomer?.id,
      },
    });

    if (customersStore[0]?.store?.id) {
      console.log("Ya tiene tienda", customersStore[0]?.store?.id);
      return new StepResponse(null);
    }

    const newStore = await StoreModuleService.createStores({
      name: `${dataCustomer?.first_name ?? ""} ${
        dataCustomer?.last_name ?? ""
      } Store`,
      supported_currencies: [
        {
          currency_code: "cop",
          is_default: true,
        },
      ],
    });

    const linkDefinition = {
      [Modules.STORE]: {
        store_id: newStore.id,
      },
      [Modules.CUSTOMER]: {
        customer_id: dataCustomer?.id,
      },
    };

    return new StepResponse(
      { newStore, linkDefinition },
      { storeId: newStore.id }
    );
  },
  async (data, { container }) => {
    if (!data) {
      return;
    }

    const { storeId } = data;

    if (storeId) {
      const storeModuleService = container.resolve(Modules.STORE);
      await storeModuleService.deleteStores([storeId]);
    }
  }
);

export default createSellerStoreStep;
