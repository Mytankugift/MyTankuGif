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
  phone: string | null
  profile: {
    avatar: string | null
    banner: string | null
    bio: string | null
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
  price: number
  suggestedPrice: number | null
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
    firstName: string | null
    lastName: string | null
    profile: {
      avatar: string | null
    } | null
  }
  reactionsCount?: number
  commentsCount?: number
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
    firstName: string | null
    lastName: string | null
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
    price: number
    suggestedPrice?: number | null
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
export interface OrderDTO {
  id: string
  email: string
  status: string
  paymentStatus: string
  paymentMethod: string
  total: number
  subtotal: number
  shippingTotal: number
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
      price: number
    } | null
    product: {
      id: string
      title: string
      handle: string
      thumbnail: string | null
    }
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

// StalkerGift
export interface StalkerGiftDTO {
  id: string
  orderId: string | null
  customerGiverId: string
  customerRecipientId: string | null
  totalAmount: number
  firstName: string
  phone: string
  email: string
  alias: string
  recipientName: string
  contactMethods: Array<{ type: string; value: string }>
  products: Array<{
    id: string
    title: string
    quantity: number
    price: number
  }>
  message: string | null
  paymentStatus: 'pending' | 'success' | 'failed' | 'recibida'
  paymentMethod: string
  transactionId: string | null
  chatEnabled: boolean
  createdAt: string
  updatedAt: string
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

