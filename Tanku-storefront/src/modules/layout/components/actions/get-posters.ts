export interface PosterData {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  title?: string
  description?: string
  image_url: string
  video_url?: string
  likes_count: number
  comments_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GetPostersResponse {
  success: boolean
  posters: PosterData[]
  error?: string
}

export async function getPosters(customer_id: string): Promise<GetPostersResponse> {
  try {
    console.log('=== GET POSTERS ACTION ===')
    console.log('Customer ID:', customer_id)

    // Hacer la petición al backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/posters/get-posters?customer_id=${encodeURIComponent(customer_id)}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '',
        },
      }
    )

    console.log('Response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error response:', errorData)
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log('Success response:', result)

    return result

  } catch (error) {
    console.error('Error in getPosters:', error)
    return {
      success: false,
      posters: [],
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}
