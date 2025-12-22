

const deleteVariant = async (variantId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/seller/variant/${variantId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
          },
        }
      )
  
      if (!response.ok) {
        throw new Error(`Error al eliminar la variante: ${response.statusText}`)
      }
  
      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error al eliminar la variante:", error)
      throw error
    }
  }