import { StoryMedia } from '../story-upload/index'
import { retrieveCustomer } from "@lib/data/customer"

export interface CreateStoryData {
  title?: string
  description?: string
  files: File[]
  customer_id: string
}

export interface CreateStoryResponse {
  success: boolean
  story?: {
    id: string
    title?: string
    description?: string
    media: Array<{
      id: string
      type: 'image' | 'video'
      url: string
    }>
    timestamp: string
  }
  error?: string
}

/**
 * Función para crear una nueva historia enviando archivos y datos al backend
 */
export async function createStory(data: CreateStoryData): Promise<CreateStoryResponse> {
  console.log("entro a la creacion de la historia", data.customer_id)
  if(!data.customer_id){
    console.log("entro al if de la creacion de la historia", data.customer_id)
    const customer = await retrieveCustomer().catch(() => null)
    data.customer_id = customer?.id || ""
    console.log("Customer ID: ", data.customer_id)
  }
  
  try {
    // Crear FormData para enviar archivos
    const formData = new FormData()
    
    // Agregar archivos
    data.files.forEach((file, index) => {
      formData.append(`files`, file)
    })
    
    // Agregar metadatos
    if (data.title) {
      formData.append('title', data.title)
    }
    
    if (data.description) {
      formData.append('description', data.description)
    }

    formData.append('customer_id', data.customer_id)
    
    // Agregar timestamp
    formData.append('timestamp', new Date().toISOString())

    // Realizar petición POST al backend
    const response = await fetch(  `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/social/stories/create-story`, {
      method: 'POST',
      body: formData,
      credentials: "include",
      headers: {
        "x-publishable-api-key":
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "temp",
      },
      // No establecer Content-Type, el navegador lo hará automáticamente para FormData
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    
    return {
      success: true,
      story: result.story
    }
    
  } catch (error) {
    console.error('Error creating story:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al crear la historia'
    }
  }
}

/**
 * Función para obtener historias del usuario autenticado
 */
export async function getUserStories(): Promise<CreateStoryResponse[]> {
  try {
    const response = await fetch('/api/stories/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.stories || []
    
  } catch (error) {
    console.error('Error fetching user stories:', error)
    return []
  }
}

/**
 * Función para obtener todas las historias (del usuario y amigos)
 */
export async function getAllStories(): Promise<CreateStoryResponse[]> {
  try {
    const response = await fetch('/api/stories/all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.stories || []
    
  } catch (error) {
    console.error('Error fetching all stories:', error)
    return []
  }
}
