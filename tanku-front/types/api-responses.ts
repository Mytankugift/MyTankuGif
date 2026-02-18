/**
 * Tipos de respuesta de API
 * Centraliza todos los tipos de respuesta para evitar errores de tipo
 */

// Respuestas de reacciones/likes
export interface LikeResponse {
  liked: boolean
}

// Respuestas de perfil de usuario
export interface UserProfileResponse {
  id: string
  userId: string
  avatar: string | null
  banner: string | null
  bio: string | null
  isPublic: boolean
  allowPublicWishlistsWhenPrivate?: boolean
  allowGiftShipping?: boolean
  useMainAddressForGifts?: boolean
  socialLinks?: Array<{ platform: string; url: string }>
  createdAt: string
  updatedAt: string
}

// Respuesta completa del usuario (ME endpoint)
export interface UserMeResponse {
  id: string
  username: string | null
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
  requiresDataPolicyAcceptance?: boolean
  profile: {
    avatar: string | null
    banner: string | null
    bio: string | null
    isPublic: boolean
    socialLinks?: Array<{ platform: string; url: string }>
  } | null
}

// Respuestas genéricas de éxito
export interface SuccessResponse {
  success: boolean
  message?: string
}

// Respuestas de actualización
export interface UpdateResponse {
  success: boolean
  data?: any
  message?: string
}

