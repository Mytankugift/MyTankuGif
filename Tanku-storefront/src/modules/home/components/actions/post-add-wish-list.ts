// Constants for privacy types
export const PRIVATE_ID = "PRIVATE_ID"
export const PUBLIC_ID = "PUBLIC_ID"

type AddWishListParams = {
  title: string
  isPublic: boolean
  customerId: string
}

export const postAddWishList = async (params: AddWishListParams) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/wish-list/create-wish-list`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify({
          title: params.title,
          state_id: params.isPublic ? PUBLIC_ID : PRIVATE_ID,
          customerId: params.customerId
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