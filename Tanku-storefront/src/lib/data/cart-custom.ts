"use server"

import { revalidateTag } from "next/cache"
import { getCacheTag, getCartId } from "./cookies"

/**
 * Función personalizada para actualizar cantidad de items en el carrito
 * Usa nuestro endpoint personalizado en lugar del SDK de Medusa
 */
export async function updateLineItemCustom({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/cart/update-item`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart_id: cartId,
          line_id: lineId,
          quantity: quantity
        })
      }
    )

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || `Error ${response.status}: ${response.statusText}`)
    }

    if (!result.success) {
      throw new Error(result.message || 'Error al actualizar item del carrito')
    }
    
    // Revalidar cache
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag)
    
    return result.data || result

  } catch (error: any) {
    console.error(`❌ [UPDATE-LINE-ITEM-CUSTOM] Error:`, error)
    throw error
  }
}

/**
 * Función personalizada para eliminar items del carrito
 * Usa nuestro endpoint personalizado en lugar del SDK de Medusa
 */
export async function deleteLineItemCustom(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/cart/delete-item`,
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart_id: cartId,
          line_id: lineId
        })
      }
    )

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || `Error ${response.status}: ${response.statusText}`)
    }

    if (!result.success) {
      throw new Error(result.message || 'Error al eliminar item del carrito')
    }
    
    // Revalidar cache
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag)
    
    // Emitir evento para actualizar carrito inmediatamente
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cartUpdated'))
    }
    
    return result.data || result

  } catch (error: any) {
    throw error
  }
}