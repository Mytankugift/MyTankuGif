"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export const retrieveOrder = async (id: string, useCache: boolean = true) => {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const headers = await getAuthHeaders()

  try {
    console.log(`📋 [RETRIEVE-ORDER] Obteniendo orden: ${id}`)
    
    const response = await fetch(
      `${backendUrl}/store/orders/${id}`,
      {
        method: "GET",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: useCache ? "force-cache" : "no-store",
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ [RETRIEVE-ORDER] Orden ${id} no encontrada`)
        return null
      }
      const errorText = await response.text()
      console.error(`❌ [RETRIEVE-ORDER] Error: ${response.status} - ${errorText}`)
      throw new Error(`Error obteniendo orden: ${response.status}`)
    }

    const data = await response.json()
    const order = data.order

    if (!order) {
      console.warn(`⚠️ [RETRIEVE-ORDER] Respuesta no contiene order`)
      return null
    }

    console.log(`✅ [RETRIEVE-ORDER] Orden obtenida:`, {
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      total: order.total,
    })

    return order
  } catch (error: any) {
    console.error(`❌ [RETRIEVE-ORDER] Error:`, error)
    throw error
  }
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, any>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
        fields: "*items,+items.metadata,*items.variant,*items.product",
        ...filters,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}
