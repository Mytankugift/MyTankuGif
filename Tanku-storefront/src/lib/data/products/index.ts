/**
 * Products API Service
 * Servicios para interactuar con productos desde Medusa
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

// Tipos
export interface ProductPrice {
  id: string
  amount: number
  currency_code: string
  calculated_amount?: number
}

export interface ProductVariant {
  id: string
  title?: string
  sku?: string
  inventory_quantity?: number
  calculated_price?: ProductPrice
  prices?: ProductPrice[]
}

export interface MedusaProduct {
  id: string
  title: string
  subtitle?: string
  description?: string
  handle: string
  thumbnail?: string
  images?: Array<{
    id: string
    url: string
  }>
  status: string
  collection_id?: string
  type_id?: string
  variants?: ProductVariant[]
  options?: Array<{
    id: string
    title: string
    values: Array<{
      id: string
      value: string
    }>
  }>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ProductsResponse {
  products: MedusaProduct[]
  count: number
  offset: number
  limit: number
}

export interface ProductResponse {
  product: MedusaProduct
}

// ========================
// PRODUCTS API
// ========================

/**
 * Obtiene una lista de productos con filtros opcionales
 */
export async function getProducts(params?: {
  limit?: number
  offset?: number
  q?: string // búsqueda por texto
  collection_id?: string[]
  type_id?: string[]
  tags?: string[]
  region_id?: string
  currency_code?: string
  fields?: string
  expand?: string
}): Promise<ProductsResponse> {
  try {
    const queryParams = new URLSearchParams()

    if (params) {
      if (params.limit) queryParams.append("limit", params.limit.toString())
      if (params.offset) queryParams.append("offset", params.offset.toString())
      if (params.q) queryParams.append("q", params.q)
      if (params.collection_id) {
        params.collection_id.forEach(id => queryParams.append("collection_id[]", id))
      }
      if (params.type_id) {
        params.type_id.forEach(id => queryParams.append("type_id[]", id))
      }
      if (params.tags) {
        params.tags.forEach(tag => queryParams.append("tags[]", tag))
      }
      if (params.region_id) queryParams.append("region_id", params.region_id)
      if (params.currency_code) queryParams.append("currency_code", params.currency_code)
      if (params.fields) queryParams.append("fields", params.fields)
      if (params.expand) queryParams.append("expand", params.expand)
    }

    const url = `${BACKEND_URL}/store/products${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error fetching products")
    }

    return await response.json()
  } catch (error) {
    console.error("[API] Error fetching products:", error)
    throw error
  }
}

/**
 * Obtiene un producto por ID
 */
export async function getProductById(
  id: string,
  params?: {
    region_id?: string
    currency_code?: string
    fields?: string
    expand?: string
  }
): Promise<ProductResponse> {
  try {
    const queryParams = new URLSearchParams()

    if (params) {
      if (params.region_id) queryParams.append("region_id", params.region_id)
      if (params.currency_code) queryParams.append("currency_code", params.currency_code)
      if (params.fields) queryParams.append("fields", params.fields)
      if (params.expand) queryParams.append("expand", params.expand)
    }

    const url = `${BACKEND_URL}/store/products/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error fetching product")
    }

    return await response.json()
  } catch (error) {
    console.error("[API] Error fetching product:", error)
    throw error
  }
}

/**
 * Busca productos por texto
 */
export async function searchProducts(
  query: string,
  params?: {
    limit?: number
    offset?: number
    region_id?: string
    currency_code?: string
  }
): Promise<ProductsResponse> {
  return getProducts({
    q: query,
    ...params,
  })
}

/**
 * Obtiene productos de una colección
 */
export async function getProductsByCollection(
  collectionId: string,
  params?: {
    limit?: number
    offset?: number
    region_id?: string
    currency_code?: string
  }
): Promise<ProductsResponse> {
  return getProducts({
    collection_id: [collectionId],
    ...params,
  })
}

/**
 * Obtiene el precio de un producto
 */
export function getProductPrice(product: MedusaProduct): {
  amount: number
  currency_code: string
} {
  // Obtener el precio de la primera variante
  const firstVariant = product.variants?.[0]
  const price = firstVariant?.calculated_price || firstVariant?.prices?.[0]

  if (price) {
    return {
      amount: price.calculated_amount || price.amount,
      currency_code: price.currency_code,
    }
  }

  return {
    amount: 0,
    currency_code: "COP",
  }
}

/**
 * Formatea el precio para mostrar
 */
export function formatProductPrice(
  product: MedusaProduct,
  locale: string = "es-CO"
): string {
  const { amount, currency_code } = getProductPrice(product)

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency_code,
    minimumFractionDigits: 0,
  }).format(amount / 100) // Medusa guarda precios en centavos
}

/**
 * Verifica si un producto está disponible
 */
export function isProductAvailable(product: MedusaProduct): boolean {
  return (
    product.status === "published" &&
    product.variants &&
    product.variants.length > 0 &&
    product.variants.some((variant) => (variant.inventory_quantity || 0) > 0)
  )
}

/**
 * Obtiene la URL de la imagen principal del producto
 */
export function getProductThumbnail(product: MedusaProduct): string | undefined {
  return product.thumbnail || product.images?.[0]?.url
}