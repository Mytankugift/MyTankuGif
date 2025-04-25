import {
  StepResponse,
  createStep,
} from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";


const createPriceSetStep = createStep(
  "create-price-set-step",
  async (
    {
      dataVariant,
      productId,
      storeId,
    }: {
      dataVariant: {
        variantId: string;
        price: number;
        currency_code: string;
      }[];
      productId: string;
      storeId: string;
    },
    { container }
  ) => {
    const pricingModuleService = container.resolve(Modules.PRICING);
    const createdPriceSets: string[] = [];
    const createdLinks: {
      product: { variant_id: string };
      pricing: { price_set_id: string };
    }[] = [];


    for (const variant of dataVariant) {
      const priceSet = await pricingModuleService.createPriceSets({
        prices: [
          {
            amount: variant.price,
            currency_code: variant.currency_code,
          },
        ],
      });

      createdPriceSets.push(priceSet.id);
     
      const link = {
        [Modules.PRODUCT]: {
          variant_id: variant.variantId,
        },
        [Modules.PRICING]: {
          price_set_id: priceSet.id,
        },
      };

      createdLinks.push(link);
    }
    
   const dataLinks =  [...createdLinks, {
    [Modules.STORE]: {
      store_id: storeId,
    },
    [Modules.PRODUCT]: {
      product_id: productId,
    },
  }];
    
    return new StepResponse(
      { priceSets: createdPriceSets, dataLinks },
      { priceSets: createdPriceSets }
    );
  },
  async (data, { container }) => {
    if (!data) {
      return;
    }

    const pricingModuleService = container.resolve(Modules.PRICING);
    const { priceSets } = data;

    // Eliminar los price sets creados
    if (priceSets.length) {
      await pricingModuleService.deletePriceSets(priceSets);
    }
  }
);

export default createPriceSetStep;
