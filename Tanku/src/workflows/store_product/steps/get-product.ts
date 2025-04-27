import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

type GetProductByHandleInput = {
  handle: string
}

// Paso para obtener el producto por handle
const getProductByHandleStep = createStep(
  "get-product-by-handle-tanku",
  async (input: GetProductByHandleInput, { container }) => {
    
   
      const query = container.resolve(ContainerRegistrationKeys.QUERY);
  
      // Obtener el producto con sus opciones y variantes
      const { data: productsData } = await query.graph({
        entity: "product",
        fields: [
          "*",
          "options.*",
          "options.values.*",
          "variants.*",
          "variants.options.*",
          "images.*",
          "store.*"
        ],
        filters: {
          handle: input.handle
        },
      });

      if (!productsData.length) {
        return new StepResponse(null);
      }

      const product = productsData[0];
      

      // Obtener el inventario para cada variante
      const variantsWithInventory = await Promise.all(product.variants.map(async (variant) => {
        const { data: inventoryData } = await query.graph({
          entity: "variant_inventory_tanku",
          fields: ["*"],
          filters: {
            variant_id: variant.id
          },
        });

        // Obtener los valores de opciones para esta variante
        const optionValues = variant.options ? variant.options.reduce((acc: Record<string, string>, option) => {
          acc[option.option_id || "option"] = option.value;
          return acc;
        }, {} as Record<string, string>) : {};

        return {
          ...variant,
          inventory: inventoryData[0] || null,
          option_values: optionValues
        };
      }));

      // Retornar el producto con las variantes actualizadas
      return new StepResponse({
        ...product,
        variants: variantsWithInventory
      });
  }
);

export default getProductByHandleStep;

