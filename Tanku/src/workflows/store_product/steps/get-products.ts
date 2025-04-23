import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const getProductsStep = createStep(
  "get-products-step",
  async (
    _,
    { container }
  ) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data: productsData } = await query.graph({
      entity: "product",
      fields: [
        "*",
        "variants.*",
      ],
    });
    
    const products = productsData?.filter(product => product != undefined) || [];
    
    const productsWithInventory = await Promise.all(products.map(async (product) => {
      const variantsWithInventory = await Promise.all(product.variants.map(async (variant) => {
        const { data: inventoryData } = await query.graph({
          entity: "variant_inventory_tanku",
          fields: ["*"],
          filters: {
            variant_id: variant.id
          },
        });

        return {
          ...variant,
          inventory: inventoryData[0] || null
        };
      }));

      return {
        ...product,
        variants: variantsWithInventory
      };
    }));

    return new StepResponse(productsWithInventory);
  }
);

export default getProductsStep;