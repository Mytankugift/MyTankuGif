export const fetchFeedPosts = async (customerId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/posters/get-feed-poster?customer_id=${customerId}`,
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
        throw new Error(`Error al obtener los posts: ${response.statusText}`)
      }

      const result = await response.json()
      
      return result.posterFeed || []
    } catch (error) {
      console.error("Error al obtener los posts:", error)
      return []
    }
  }