// Constants for privacy types
export const PRIVATE_ID = "PRIVATE_ID"
export const PUBLIC_ID = "PUBLIC_ID"

type AddProductToWishListParams = {
  productId: string
  wishListId: string
}

export const deleteProductToWishList = async (params: AddProductToWishListParams) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/wish-list/remove-producto-to-wish-list`,
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify({
          productId: params.productId,
          wishListId: params.wishListId
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Error removing product from wish list: ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Product removed from wish list successfully:", data)
    return data
  } catch (error) {
    console.error("Failed to remove product from wish list:", error)
    throw error
  }
}