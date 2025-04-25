import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VARIANT_INVENTORY_TANKU_MODULE } from "../../../modules/variant_inventory_tanku";
import VariantInventoryTankuModuleService from "../../../modules/variant_inventory_tanku/service";

const getProductsByStoreStep = createStep(
  "get-products-by-store-step",
  async (
    { storeId, currencyCode }: { storeId: string, currencyCode?: string },
    { container }
  ) => {
    
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data: productsData } = await query.graph({
      entity: "store",
      fields: [
        "products.*",
        "products.variants.*",
      ],
      filters: {
        id: storeId
      },
    });
    
    const products = productsData[0].products?.filter(product => product != undefined);
    if (!products) {
      return new StepResponse([])
    }
    
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

    return new StepResponse(productsWithInventory)
  }
)

export default getProductsByStoreStep