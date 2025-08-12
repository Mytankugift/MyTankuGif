export interface CreatePosterData {
  title?: string
  description?: string
  imageFile?: File
  videoFile?: File
  customer_id: string
}

export interface CreatePosterResponse {
  success: boolean
  poster?: {
    id: string
    title?: string
    description?: string
    image_url: string
    video_url?: string
    created_at: string
  }
  error?: string
}

export async function createPoster(data: CreatePosterData): Promise<CreatePosterResponse> {
  try {
    console.log('=== CREATE POSTER ACTION ===')
    console.log('Data:', {
      title: data.title,
      description: data.description,
      customer_id: data.customer_id,
      hasImage: !!data.imageFile,
      hasVideo: !!data.videoFile
    })

    // Crear FormData
    const formData = new FormData()
    
    // Agregar datos del formulario
    formData.append('customer_id', data.customer_id)
    if (data.title) {
      formData.append('title', data.title)
    }
    if (data.description) {
      formData.append('description', data.description)
    }

    // Agregar archivos
    if (data.imageFile) {
      formData.append('files', data.imageFile)
    }
    if (data.videoFile) {
      formData.append('files', data.videoFile)
    }

    console.log('FormData prepared, sending request...')

    // Hacer la petición al backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/posters/create-poster`,
      {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
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
    console.error('Error in createPoster:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}
