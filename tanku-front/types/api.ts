/**
 * DTOs del backend - IMPORTANTE: Mantener sincronizados con backend
 * Estos tipos deben coincidir con los DTOs en tanku-backend/src/shared/dto/
 */

// Auth
export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  username: string | null
  phone: string | null
  requiresDataPolicyAcceptance?: boolean
  profile: {
    avatar: string | null
    banner: string | null
    bio: string | null
    socialLinks?: Array<{ platform: string; url: string }>
  } | null
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// Products
export interface ProductVariantDTO {
  id: string
  sku: string
  title: string
  tankuPrice: number // Precio final calculado
  stock: number
  active: boolean
  attributes: Record<string, any> | null
  // Propiedades adicionales para compatibilidad
  imageUrl?: string | null
}

export interface ProductDTO {
  id: string
  title: string
  handle: string
  description: string | null
  images: string[]
  active: boolean
  category: {
    id: string
    name: string
    handle: string
    parentId?: string | null
  } | null
  variants: ProductVariantDTO[]
  // Propiedades adicionales para compatibilidad
  price?: number // Precio mínimo (derivado de variants)
  createdAt?: string
  thumbnail?: string // Primera imagen
}

export interface CategoryDTO {
  id: string
  name: string
  handle: string
  description: string | null
}

// Feed
export interface FeedItemDTO {
  id: string
  type: 'product' | 'poster'
  createdAt: string
  title: string
  imageUrl: string
  price?: number
  category?: {
    id: string
    name: string
    handle: string
  }
  handle?: string // Para productos, necesario para obtener detalles
  // Para posters
  author?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    username: string | null
    avatar: string | null
  }
  reactionsCount?: number
  commentsCount?: number
  // Para productos: likes
  likesCount?: number
  isLiked?: boolean
}

export interface FeedResponseDTO {
  items: FeedItemDTO[]
  nextCursorToken: string | null
}

// Posters
export interface PosterDTO {
  id: string
  userId: string
  title: string | null
  description: string | null
  imageUrl: string | null
  videoUrl: string | null
  author: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    username: string | null
    profile: {
      avatar: string | null
    } | null
  }
  reactionsCount: number
  commentsCount: number
  createdAt: string
}

// Cart
export interface CartItem {
  id: string
  variantId: string
  quantity: number
  unitPrice: number
  total: number
  createdAt: string
  product?: {
    id: string
    title: string
    handle: string
    images: string[]
  }
  variant?: {
    id: string
    sku: string
    title: string
    tankuPrice: number // Precio final calculado
    stock: number
  }
  // Propiedades adicionales para compatibilidad
  productId?: string // Derivado de product?.id
  price?: number // Alias de unitPrice para compatibilidad
}

export interface Cart {
  id: string
  userId?: string | null
  items: CartItem[]
  subtotal: number
  total: number
  createdAt?: string
  updatedAt?: string
}

// Orders
export interface StalkerGiftInfoDTO {
  id: string
  senderId: string
  receiverId: string | null
  senderAlias: string
  senderMessage: string | null
}

export interface OrderDTO {
  id: string
  userId: string // ID del usuario que recibió la orden (receiver en StalkerGift)
  email: string
  status: string
  paymentStatus: string
  paymentMethod: string
  total: number
  subtotal: number
  shippingTotal: number
  isStalkerGift?: boolean
  stalkerGift?: StalkerGiftInfoDTO | null // Información del StalkerGift si aplica
  items: Array<{
    id: string
    productId: string
    variantId: string
    quantity: number
    price: number
    finalPrice?: number // Precio final con incrementos
    final_price?: number // Alias para compatibilidad con backend
    dropiOrderId?: number | null
    dropiShippingCost?: number | null
    dropiDropshipperWin?: number | null
    dropiStatus?: string | null
    dropiWebhookData?: any | null // Payload completo del webhook de Dropi
    product: {
      id: string
      title: string
      handle: string
      images?: string[]
    }
    variant: {
      id: string
      title: string
      price: number
    }
  }>
  address: {
    firstName: string
    lastName: string
    phone: string
    address1: string
    address2: string | null
    city: string
    state: string
    postalCode: string
    country: string
  } | null
  metadata?: Record<string, any> // Metadata de la orden (dropi_order_ids, etc.)
  createdAt: string
  updatedAt: string
}

// Address
export interface AddressDTO {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  address1: string
  address2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  isDefaultShipping: boolean
  metadata?: Record<string, any> // Para alias y otros datos
  createdAt: string
  updatedAt: string
}

export interface CreateAddressDTO {
  firstName: string
  lastName: string
  phone?: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country?: string
  isDefaultShipping?: boolean
  metadata?: Record<string, any> // Para alias
}

export interface UpdateAddressDTO {
  firstName?: string
  lastName?: string
  phone?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  isDefaultShipping?: boolean
  metadata?: Record<string, any>
}

// Checkout
export interface CheckoutShippingAddress {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  company?: string
  postal_code?: string
  city?: string
  country_code?: string
  province?: string
  phone?: string
}

export interface CheckoutOrderRequest {
  shipping_address: CheckoutShippingAddress
  billing_address?: CheckoutShippingAddress
  email: string
  payment_method: string
  cart_id?: string
}

export interface CheckoutDataCart {
  customer_id: string
  cart_id: string
  producVariants: Array<{
    variant_id: string
    quantity: number
    original_total: number
    unit_price: number
  }>
}

// Wishlists
export interface WishListDTO {
  id: string
  userId: string
  name: string
  public: boolean
  items: Array<{
    id: string
    productId: string
    variantId?: string | null
    variant?: {
      id: string
      title: string
      tankuPrice: number // Precio final calculado
    } | null
    product: {
      id: string
      title: string
      handle: string
      thumbnail: string | null
      images?: string[] // Imágenes del producto (opcional, cuando se usa mapWishListToDTOComplete)
    }
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

// StalkerGift
export interface StalkerGiftDTO {
  id: string
  senderId: string
  receiverId: string | null
  externalReceiverData: {
    instagram?: string
    email?: string
    phone?: string
    name?: string
  } | null
  productId: string
  variantId: string | null
  quantity: number
  estado: 'CREATED' | 'PAID' | 'WAITING_ACCEPTANCE' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  paymentId: string | null
  paymentStatus: string
  paymentMethod: string
  transactionId: string | null
  senderAlias: string
  senderMessage: string | null
  uniqueLink: string | null
  linkToken: string | null
  orderId: string | null
  chatEnabled: boolean
  conversationId: string | null
  createdAt: string
  updatedAt: string
  acceptedAt: string | null
  // Relaciones
  sender?: User
  receiver?: User | null
  product?: ProductDTO
  variant?: ProductVariantDTO | null
  order?: OrderDTO | null
  conversation?: any | null
}

// Onboarding
export interface OnboardingDataDTO {
  birthDate?: string | null
  categoryIds?: string[]
  activities?: string[]
  completedSteps?: string[]
  lastCompletedAt?: string | null
}

export interface UpdateOnboardingDataDTO {
  birthDate?: string | null
  categoryIds?: string[]
  activities?: string[]
  completedSteps?: string[]
}

// Friends
export type FriendStatus = 'pending' | 'accepted' | 'blocked'

export interface FriendUserDTO {
  id: string
  firstName: string | null
  lastName: string | null
  username: string | null
  email: string
  profile: {
    avatar: string | null
    banner: string | null
    bio: string | null
  } | null
}

export interface FriendDTO {
  id: string
  userId: string
  friendId: string
  status: FriendStatus
  friend: FriendUserDTO
  createdAt: string
  updatedAt: string
}

export interface FriendRequestDTO {
  id: string
  userId: string
  friendId: string
  status: FriendStatus
  fromUser: FriendUserDTO
  createdAt: string
  updatedAt: string
}

export interface CreateFriendRequestDTO {
  friendId: string
}

export interface UpdateFriendRequestDTO {
  status: 'accepted' | 'rejected'
}

export interface FriendSuggestionDTO {
  userId: string
  user: FriendUserDTO
  reason: string
  mutualFriendsCount?: number
  mutualFriendNames?: string[]
  commonCategories?: string[] // Nombres de categorías comunes
  commonActivities?: string[] // Actividades comunes
}

// Notifications
export interface NotificationDTO {
  id: string
  type: string
  title: string
  message: string
  data: any | null
  isRead: boolean
  createdAt: string
  readAt: string | null
}

export interface NotificationCountDTO {
  unreadCount: number
  totalCount: number
}

