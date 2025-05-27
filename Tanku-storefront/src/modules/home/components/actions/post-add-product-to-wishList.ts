// Constants for privacy types
export const PRIVATE_ID = "PRIVATE_ID"
export const PUBLIC_ID = "PUBLIC_ID"

type AddProductToWishListParams = {
  productId: string
  wishListId: string
}

/**
 * Creates a new wish list with the given title and privacy setting
 * @param params - Object containing title and isPublic flag
 * @returns Promise with the created wish list data
 */
export const postAddProductToWishList = async (params: AddProductToWishListParams) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/wish-list/add-product-to-wish-list`,
      {
        method: "POST",
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
      throw new Error(`Error creating wish list: ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Wish list created successfully:", data)
    return data
  } catch (error) {
    console.error("Failed to create wish list:", error)
    throw error
  }
}