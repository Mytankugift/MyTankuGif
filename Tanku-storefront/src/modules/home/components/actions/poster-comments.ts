export interface PosterComment {
  id: string
  poster_id: string
  customer_id: string
  customer_name: string
  customer_email: string
  content: string
  parent_id: string | null
  replies?: PosterComment[]
  replies_count?: number
  created_at: string
  updated_at: string
}

export interface PosterCommentsResponse {
  comments: PosterComment[]
  total_count: number
}

// Get comments for a poster
export const getPosterComments = async (posterId: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/posters/comments?poster_id=${posterId}`,
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
      throw new Error(`Error al obtener comentarios: ${response.statusText}`)
    }

    const result = await response.json()
    return result as PosterCommentsResponse
  } catch (error) {
    console.error("Error al obtener comentarios:", error)
    return { comments: [], total_count: 0 }
  }
}

// Add a comment to a poster
export const addPosterComment = async (posterId: string, customerId: string, content: string, parentId?: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/posters/comments`,
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
          content: content,
          parent_id: parentId || null,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Error al agregar comentario: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al agregar comentario:", error)
    throw error
  }
}

// Edit a comment
export const editPosterComment = async (commentId: string, content: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/posters/comments/${commentId}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
        },
        body: JSON.stringify({
          content: content,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Error al editar comentario: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al editar comentario:", error)
    throw error
  }
}

// Delete a comment
export const deletePosterComment = async (commentId: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/posters/comments/${commentId}`,
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
      throw new Error(`Error al eliminar comentario: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error al eliminar comentario:", error)
    throw error
  }
}
