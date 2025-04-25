import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { addLineItemInput } from "..";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createLineItemsStep } from "@medusajs/medusa/core-flows";
import { CreateLineItemForCartDTO } from "@medusajs/framework/types";

const addLineItemStep = createStep(
  "add-line-item-step",
  async (
    { variant_id, quantity, cart_id }: addLineItemInput,
    { container }
  ) => {

    
const query = container.resolve(ContainerRegistrationKeys.QUERY);
const cartLineItem = container.resolve(Modules.CART)
const { data: productVariant } = await query.graph({
    entity: "variant",
    fields: [ "*",
      "product.*",
      "variant_inventory_tanku.*"
    ],
    filters: {
      id: variant_id
    },
  });
   
  if (!productVariant || !productVariant[0]) {
    throw new Error('Variante de producto no encontrada');
  }

  const variant = productVariant[0];
  const product = variant.product;

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  if (!variant.variant_inventory_tanku?.price) {
    throw new Error('Precio no definido para el producto');
  }

  const lineItemData = {
    cart_id: cart_id,
    title: variant.title || 'Producto sin título',
    unit_price: variant.variant_inventory_tanku.price,
    quantity: quantity,
    thumbnail: product.thumbnail || '',
    variant_id: variant_id,
    product_id: product.id,
    product_title: product.title || 'Producto sin título',
    product_description: product.description || '',
    variant_sku: variant.sku || '',
    variant_title: variant.title || ''
  }



  const data = await cartLineItem.addLineItems(lineItemData)



  return new StepResponse(data)
            
  },
  async (lineItemId, { container }) => {
    if (!lineItemId) {
      return
    }
    const cartLineItem = container.resolve(Modules.CART)
    await cartLineItem.deleteLineItems(lineItemId[0].id)
  }
);

export default addLineItemStep;
