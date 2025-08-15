export interface PosterReaction {
  id: string
  poster_id: string
  customer_id: string
  reaction_type: "like" | "love" | "laugh" | "angry" | "tanku"
  created_at: string
  updated_at: string
}

export interface PosterReactionsResponse {
  reactions: PosterReaction[]
  total_count: number
  user_reaction?: PosterReaction
}

// Toggle like on a poster
export const togglePosterLike = async (posterId: string, customerId: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/posters/reactions/toggle-like`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify({
          poster_id: posterId,
          customer_id: customerId,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Error al alternar like: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al alternar like:", error)
    throw error
  }
}

// Get reactions for a poster
export const getPosterReactions = async (posterId: string, customerId?: string) => {
  try {
    const params = new URLSearchParams({ poster_id: posterId })
    if (customerId) {
      params.append("customer_id", customerId)
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/posters/reactions?${params}`,
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
      throw new Error(`Error al obtener reacciones: ${response.statusText}`)
    }

    const result = await response.json()
    return result as PosterReactionsResponse
  } catch (error) {
    console.error("Error al obtener reacciones:", error)
    return { reactions: [], total_count: 0 }
  }
}
