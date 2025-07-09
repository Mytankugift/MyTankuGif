import {
  StepResponse,
  createStep,
  WorkflowData
} from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";

type VariantPriceData = {
  variantId: string;
  price: number;
  currency_code: string;
};

type ProductPriceData = {
  dataVariant: VariantPriceData[];
  productId: string;
  storeId: string;
};

type PriceSetResult = {
  priceSets: string[];
  dataLinks: any[];
};

const createPricesStep = createStep(
  "create-prices-step",
  async (
    productsData: ProductPriceData[] | WorkflowData<ProductPriceData[]>,
    { container }
  ) => {
    console.log("productsDataaaaaaaaaaa", productsData)
    const pricingModuleService = container.resolve(Modules.PRICING);
    const allResults: PriceSetResult[] = [];
    const allPriceSets: string[] = [];

    // Process each product's variants
    for (const productData of productsData) {
      const { dataVariant, productId, storeId } = productData;
      const createdPriceSets: string[] = [];
      const createdLinks: any[] = [];

      // Create price sets for each variant
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
        allPriceSets.push(priceSet.id);

        // Create link for variant to price set
        createdLinks.push({
          [Modules.PRODUCT]: {
            variant_id: variant.variantId,
          },
          [Modules.PRICING]: {
            price_set_id: priceSet.id,
          },
        });
      }

      // Add store and product link
      createdLinks.push({
        [Modules.STORE]: {
          store_id: storeId,
        },
        [Modules.PRODUCT]: {
          product_id: productId,
        },
      });

      allResults.push({
        priceSets: createdPriceSets,
        dataLinks: createdLinks,
      });
    }

    // Flatten all data links for the response
    const allDataLinks = allResults.flatMap(result => result.dataLinks);

    console.log("allDataLinks", allDataLinks)
    console.log("allPriceSets", allPriceSets)
    console.log("allResults", allResults)
    return new StepResponse(
      { 
        priceSets: allPriceSets, 
        dataLinks: allDataLinks,
        results: allResults 
      },
      { priceSets: allPriceSets }
    );
  },
  async (data, { container }) => {
    if (!data) {
      return;
    }

    const pricingModuleService = container.resolve(Modules.PRICING);
    const { priceSets } = data;

    // Delete all created price sets on rollback
    if (priceSets?.length) {
      await pricingModuleService.deletePriceSets(priceSets);
    }
  }
);

export default createPricesStep;