export const fetchSellerRequest = async (clientId: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/seller/request?clientId=${clientId}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Error al obtener los datos: ${response.statusText}`)
    }

    const result = await response.json()

    return result
  } catch (error) {
    console.error("Error al obtener los datos:", error)
    throw error
  }
}
