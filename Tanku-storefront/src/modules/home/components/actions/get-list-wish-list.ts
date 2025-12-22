
export const getListWishList = async (customerId: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/wish-list/${customerId}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
      }
    )
    const data = await response.json()
    return data.data.result
  } catch (error) {
    console.error("Error al obtener las listas de deseos:", error)
    throw error
  }
}