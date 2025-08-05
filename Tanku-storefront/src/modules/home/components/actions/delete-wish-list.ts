type DeleteWishListParams = {
  wishListId: string
}

export const deleteWishList = async (params: DeleteWishListParams) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/wish-list/delete-wish-list`,
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify({
          wishListId: params.wishListId
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Error deleting wish list: ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Wish list deleted successfully:", data)
    return data
  } catch (error) {
    console.error("Failed to delete wish list:", error)
    throw error
  }
}
