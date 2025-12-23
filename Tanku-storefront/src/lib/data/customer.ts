"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import jwt from "jsonwebtoken"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeAuthToken,
  setAuthToken,
} from "./cookies"
// Mapper no longer needed - backend returns Medusa-compatible format directly

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    // Check if authHeaders contains authorization token
    if (!authHeaders || !('authorization' in authHeaders)) {
      return null
    }

    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    
    try {
      // Fetch customer data from our custom backend (now includes addresses)
      const customerResponse = await fetch(
        `${backendUrl}/store/customers/me`,
        {
          method: "GET",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          credentials: "include",
          cache: "no-store", // Always fetch fresh data
        }
      )

      if (!customerResponse.ok) {
        if (customerResponse.status === 401 || customerResponse.status === 404) {
          return null
        }
        const errorText = await customerResponse.text()
        console.error("❌ Error fetching customer:", customerResponse.status, errorText)
        return null
      }

      const customerData = await customerResponse.json()
      const backendCustomer = customerData.customer

      if (!backendCustomer) {
        return null
      }

      // Backend now returns addresses embedded in customer object (Medusa-compatible format)
      // Ensure addresses array exists (backend should always include it)
      const addresses = Array.isArray(backendCustomer.addresses) 
        ? backendCustomer.addresses 
        : []

      // Debug: Log addresses to verify they're being returned
      if (addresses.length > 0) {
        console.log(`✅ [RETRIEVE-CUSTOMER] Customer tiene ${addresses.length} direcciones:`, addresses.map(a => ({ id: a.id, alias: a.metadata?.alias, address_1: a.address_1, is_default: a.is_default_shipping })))
      } else {
        console.log(`⚠️ [RETRIEVE-CUSTOMER] Customer no tiene direcciones`)
      }

      // Backend already returns Medusa-compatible format, just ensure all required fields
      const medusaCustomer: HttpTypes.StoreCustomer = {
        id: backendCustomer.id,
        email: backendCustomer.email || "",
        first_name: backendCustomer.first_name || null,
        last_name: backendCustomer.last_name || null,
        phone: backendCustomer.phone || null,
        created_at: backendCustomer.created_at || new Date().toISOString(),
        updated_at: backendCustomer.updated_at || new Date().toISOString(),
        metadata: backendCustomer.metadata || {},
        addresses: addresses, // Addresses are already in Medusa-compatible format from backend
        orders: backendCustomer.orders || [], // Use orders from backend if available
      }

      return medusaCustomer
    } catch (error: any) {
      console.error("❌ Error fetching customer from API:", error)
      console.error("Error details:", error.message, error.status)
      return null
    }
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = await getAuthHeaders()

  try {
    // Usar fetch directo en lugar del SDK de Medusa
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/customers/me`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    const customer = result.customer

    // Revalidar cache
    const cacheTag = await getCacheTag("customers")
    revalidateTag(cacheTag)

    return customer
  } catch (error: any) {
    console.error("❌ [UPDATE-CUSTOMER] Error:", error)
    throw error
  }
}

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      headers
    )

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    await transferCart()
    
    return createdCustomer ; 
  } catch (error: any) {
    return error.toString()
  }
  
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    const token = await sdk.auth.login("customer", "emailpass", { email, password })
    await setAuthToken(token as string)
    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)
    
    // Transferir carrito después del login
    try {
      await transferCart()
    } catch (error: any) {
      console.error("Error transferiendo carrito:", error)
      // No fallar el login si falla la transferencia del carrito
    }
    
    // Retornar undefined para indicar éxito (el redirect se maneja en el componente cliente)
    return undefined
  } catch (error: any) {
    return error.toString()
  }
}

type DecodedToken = {
  uid: number
  eml: string
  exp: number
}


export async function signout(countryCode: string) {
  try {
    // Cerrar sesión en Medusa (esto cierra la sesión tanto de email/password como de OAuth)
    await sdk.auth.logout()
  } catch (error) {
    // Si falla, continuar con el logout local
    console.error("Error cerrando sesión en Medusa:", error)
  }
  
  // Remover el token de las cookies
  removeAuthToken()
  
  // Revalidar el cache del customer
  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)
  
  // No redirigir aquí - dejar que el cliente maneje la redirección
  // Esto permite que el componente cliente limpie el estado antes de redirigir
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = formData.get("is_default_shipping") === "true" || (currentState.isDefaultShipping as boolean) || false
  
  const alias = formData.get("metadata[alias]") as string
  
  const address: any = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  // Solo agregar phone si existe y no está vacío
  const phone = formData.get("phone") as string
  if (phone && phone.trim() !== "") {
    address.phone = phone
  }
  
  if (alias) {
    address.metadata = { alias }
  }

  const headers = await getAuthHeaders()
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  try {
    const response = await fetch(
      `${backendUrl}/store/customers/me/addresses`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(address),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    const customer = result.customer

    // Revalidar cache
    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    // Retornar la última dirección creada (la que tiene el alias si existe)
    // Backend already returns addresses in Medusa-compatible format
    const addresses = customer.addresses || []
    const newAddress = addresses.find(a => 
      alias ? (a.metadata?.alias as string) === alias : true
    ) || addresses[addresses.length - 1]

    return { success: true, error: null, address: newAddress }
  } catch (err: any) {
    return { success: false, error: err.toString(), address: null }
  }
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = await getAuthHeaders()
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  try {
    const response = await fetch(
      `${backendUrl}/store/customers/me/addresses/${addressId}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }

    // Revalidar cache
    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    return { success: true, error: null } as any
  } catch (err: any) {
    return { success: false, error: err.toString() } as any
  }
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const alias = formData.get("metadata[alias]") as string
  const isDefaultShipping = formData.get("is_default_shipping") === "true"
  
  const address: any = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }
  
  if (alias) {
    address.metadata = { alias }
  }
  
  if (isDefaultShipping !== undefined) {
    address.is_default_shipping = isDefaultShipping
  }

  const headers = await getAuthHeaders()
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  try {
    const response = await fetch(
      `${backendUrl}/store/customers/me/addresses/${addressId}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(address),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    const customer = result.customer

    // Revalidar cache
    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    // Retornar la dirección actualizada
    // Backend already returns addresses in Medusa-compatible format
    const addresses = customer.addresses || []
    const updatedAddress = addresses.find(a => a.id === addressId)

    return { success: true, error: null, address: updatedAddress }
  } catch (err: any) {
    return { success: false, error: err.toString(), address: null }
  }
}
