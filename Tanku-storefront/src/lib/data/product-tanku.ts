export const fetchTankuProduct = async (handle: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/product/tanku/${handle}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
          },
        }
      )
  
  
      const result = await response.json()
     
      return result.product
    } catch (error) {
      console.error("Error al obtener los datos:", error)
      throw error
    }
  }
  