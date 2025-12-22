export interface ProductVariant {
  id: string
  title: string
  inventory?: {
    price: number
    currency_code: string
  } | null
}

export interface ProductSuggestion {
  id: string
  title: string
  handle: string
  description: string
  thumbnail: string
  status: string
  variants: ProductVariant[]
}

export interface ProductSuggestionsResponse {
  success: boolean
  data: ProductSuggestion[]
  count: number
}

export const getProductSuggestions = async (limit: number = 10): Promise<ProductSuggestionsResponse> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/product-suggestions?limit=${limit}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error al obtener sugerencias de productos:", error)
    throw error
  }
}
