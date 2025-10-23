export interface WishlistProduct {
  id: string
  title: string
  handle: string
  description: string
  thumbnail: string
  status: string
  variants?: {
    id: string
    title: string
    inventory?: {
      price: number
      currency_code: string
    } | null
  }[]
}

export interface PublicWishlist {
  id: string
  title: string
  state_id: string
  products: WishlistProduct[]
  created_at: string
  updated_at: string
}

export interface PublicWishlistsResponse {
  success: boolean
  data: PublicWishlist[]
  count: number
  message?: string
}

export const getPublicWishlists = async (customerId: string): Promise<PublicWishlistsResponse> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/wishlist/public/${customerId}`,
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
    console.error("Error al obtener wishlists públicas:", error)
    throw error
  }
}
