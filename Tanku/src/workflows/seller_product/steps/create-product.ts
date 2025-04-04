import { StepResponse, createStep, StepExecutionContext } from "@medusajs/framework/workflows-sdk";
import { CreateSellerProductInput } from "..";
import { Modules } from "@medusajs/framework/utils"

const createSellerProductStep = createStep(
  "create-seller-product-step",
  async (
    { productData, thumbnail, images }: CreateSellerProductInput,
    { container }
  ) => {
    const productService = container.resolve(Modules.PRODUCT)
    const product = await productService.createProducts({
      title: productData.title,
      description: productData.description,
      options: productData.options,
      variants: productData.variants.map((variant) => ({
        title: `${productData.title} ${Object.values(variant.options).join(' ')}`,
        options: variant.options,
        prices: variant.prices,
        manage_inventory: true,
        inventory_quantity: variant.quantity,
        sku: variant.sku
      })),
      thumbnail,
      images: images.map((image) => ({ url: image })), 
      status: "published"
    })

    return new StepResponse(product, product.id)
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
