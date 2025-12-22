import { HttpTypes } from "@medusajs/types"

/**
 * Backend Address format (from our custom backend)
 * The backend returns snake_case format (first_name, last_name, etc.)
 */
export interface BackendAddress {
  id: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  address_1?: string
  address_2?: string | null // This is the detail field from backend
  city?: string
  province?: string // This is state from backend
  postal_code?: string
  country_code?: string
  metadata?: Record<string, any> | null
  is_default_shipping?: boolean
  created_at?: Date | string
  updated_at?: Date | string
}

/**
 * Maps backend Address format to Medusa-compatible format
 * 
 * @param backendAddress Address from our custom backend (already in snake_case)
 * @returns Address in Medusa-compatible format
 */
export function mapAddressToMedusa(
  backendAddress: BackendAddress
): HttpTypes.StoreCustomerAddress {
  return {
    id: backendAddress.id,
    first_name: backendAddress.first_name || "",
    last_name: backendAddress.last_name || "",
    phone: backendAddress.phone || "",
    address_1: backendAddress.address_1 || "",
    address_2: backendAddress.address_2 || "",
    city: backendAddress.city || "",
    province: backendAddress.province || "",
    postal_code: backendAddress.postal_code || "",
    country_code: (backendAddress.country_code || "co").toLowerCase(),
    metadata: backendAddress.metadata || {},
    is_default_shipping: backendAddress.is_default_shipping || false,
    is_default_billing: false, // TODO: Implement when needed
    company: null, // Not in our schema yet
    created_at: backendAddress.created_at 
      ? (typeof backendAddress.created_at === 'string' 
          ? backendAddress.created_at 
          : backendAddress.created_at.toISOString())
      : new Date().toISOString(),
    updated_at: backendAddress.updated_at
      ? (typeof backendAddress.updated_at === 'string'
          ? backendAddress.updated_at
          : backendAddress.updated_at.toISOString())
      : new Date().toISOString(),
  }
}

/**
 * Maps array of backend addresses to Medusa-compatible format
 */
export function mapAddressesToMedusa(
  backendAddresses: BackendAddress[]
): HttpTypes.StoreCustomerAddress[] {
  return backendAddresses.map(mapAddressToMedusa)
}
