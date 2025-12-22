export interface StoryFile {
  id: string
  story_id: string
  file_url: string
  file_type: string
  file_size: number
  order_index: number
}

export interface StoryData {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  title?: string
  description?: string
  duration: number
  views_count: number
  is_active: boolean
  expires_at: string
  created_at: string
  updated_at: string
  files: StoryFile[]
}

export interface GetStoriesResponse {
  success: boolean
  userStories: StoryData[]
  friendsStories: StoryData[]
  error?: string
}

/**
 * Función para obtener historias personales y de amigos desde el backend
 */
export async function getStories(customer_id: string): Promise<GetStoriesResponse> {
  try {
    console.log("=== OBTENIENDO HISTORIAS ===")
    console.log("Customer ID:", customer_id)
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/stories/get-stories?customer_id=${customer_id}`,
      {
        method: 'GET',
        credentials: "include",
        headers: {
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log("Stories response:", result)
    
    return {
      success: true,
      userStories: result.userStories || [],
      friendsStories: result.friendsStories || []
    }
    
  } catch (error) {
    console.error('Error fetching stories:', error)
    
    return {
      success: false,
      userStories: [],
      friendsStories: [],
      error: error instanceof Error ? error.message : 'Error desconocido al obtener historias'
    }
  }
}
