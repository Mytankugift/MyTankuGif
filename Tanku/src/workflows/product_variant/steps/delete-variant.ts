import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";

const deleteVariantStep = createStep(
  "delete-variant-step",
  async (
    {variantId,}: {variantId: string},
    { container }
  ) => {

 const productVariantService = container.resolve(Modules.PRODUCT)
    
    const deleteVariant = await productVariantService.deleteProductVariants([variantId])

    
    return new StepResponse(
      { variantId },
      { variantId }
    );
  },
  async (data, { container }) => {
    if (!data) {
      return;
    }

    const pricingModuleService = container.resolve(Modules.PRICING);
    const { variantId } = data;

    // Eliminar los price sets creados
    if (variantId) {
      await pricingModuleService.deletePriceSets([variantId]);
    }
  }
);

export default deleteVariantStep;
