import { StepResponse, createStep, StepExecutionContext } from "@medusajs/framework/workflows-sdk";
import { CreateSellerProductInput } from "..";
import { Modules } from "@medusajs/framework/utils"
import { VARIANT_INVENTORY_TANKU_MODULE } from "../../../modules/variant_inventory_tanku";
import VariantInventoryTankuModuleService from "../../../modules/variant_inventory_tanku/service";
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"


const createSellerProductStep = createStep(
  "create-seller-product-step",
  async (
    { productData, thumbnail, images }: CreateSellerProductInput,
    { container }
  ) => {
    const productService = container.resolve(Modules.PRODUCT)
    const variantInventoryTankuModule: VariantInventoryTankuModuleService = container.resolve(VARIANT_INVENTORY_TANKU_MODULE)

   


      const variants = productData.variants.map((variant) => ({
      title: `${productData.title} ${Object.values(variant.options).join(' ')}`,
      options: variant.options,
      prices: variant.prices,
      manage_inventory: true,
      inventory_quantity: variant.quantity,
      sku: variant.sku,
      images: images.map(image => ({
        url: image
      }))
    }))

    const product = await productService.createProducts({
      title: productData.title,
      description: productData.description,
      options: productData.options,
      thumbnail,
      status: "published"
    })

    const variantsid: {variantId: string, currency_code: string, price: number}[] = []

    for (const variant of variants) {
      const newVariant = await productService.createProductVariants({
        title: variant.title,
        product_id: product.id,
        sku: variant.sku,
        options: variant.options,
        manage_inventory: variant.manage_inventory,
      })

      variantsid.push({variantId: newVariant.id, currency_code: variant.prices[0].currency_code, price: variant.prices[0].amount})
      


      const variantInventory = await variantInventoryTankuModule.createVariantInventoryTankus({
        variant_id: newVariant.id,
        quantity_stock: variant.inventory_quantity,
        currency_code: variant.prices[0].currency_code,
        price: variant.prices[0].amount
      })
    }
    

    

    return new StepResponse({...product, variants: variantsid}, product.id)
  },
  async (productId, { container }) => {
    if (!productId) {
      return
    }
    const productService = container.resolve(Modules.PRODUCT)

    await productService.deleteProducts([productId])
  }
)


export default createSellerProductStep;
