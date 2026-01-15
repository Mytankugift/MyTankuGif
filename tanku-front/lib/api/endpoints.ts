/**
 * Endpoints del backend normalizado
 * Mantener sincronizado con el backend
 */

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    ME: '/api/v1/auth/me',
    GOOGLE: '/api/v1/auth/google',
  },
  // Products
  PRODUCTS: {
    LIST: '/api/v1/products',
    BY_HANDLE: (handle: string) => `/api/v1/products/${handle}`,
  },
  CATEGORIES: {
    LIST: '/api/v1/categories',
    BY_HANDLE: (handle: string) => `/api/v1/categories/${handle}`,
  },
  // Feed
  FEED: '/api/v1/feed',
  // Cart
  CART: {
    GET: '/api/v1/cart',
    CREATE: '/api/v1/cart',
    ADD_ITEM: '/api/v1/cart/items',
    UPDATE_ITEM: (itemId: string) => `/api/v1/cart/items/${itemId}`,
    DELETE_ITEM: (itemId: string) => `/api/v1/cart/items/${itemId}`,
  },
  // Orders
  ORDERS: {
    CREATE: '/api/v1/orders',
    LIST: '/api/v1/orders',
    BY_ID: (id: string) => `/api/v1/orders/${id}`,
    BY_TRANSACTION_ID: (transactionId: string) => `/api/v1/orders/transaction/${transactionId}`,
    DELETE: (id: string) => `/api/v1/orders/${id}`,
  },
  // Checkout
  CHECKOUT: {
    ADD_ORDER: '/api/v1/checkout/add-order',
  },
  // Users
  USERS: {
    ME: '/api/v1/users/me',
    PROFILE: '/api/v1/users/me/profile',
    PROFILE_AVATAR: '/api/v1/users/me/profile/avatar',
    PROFILE_BANNER: '/api/v1/users/me/profile/banner',
    ADDRESSES: {
      LIST: '/api/v1/users/me/addresses',
      CREATE: '/api/v1/users/me/addresses',
      UPDATE: (addressId: string) => `/api/v1/users/me/addresses/${addressId}`,
      DELETE: (addressId: string) => `/api/v1/users/me/addresses/${addressId}`,
    },
    ONBOARDING_DATA: {
      GET: '/api/v1/users/me/onboarding-data',
      UPDATE: '/api/v1/users/me/onboarding-data',
    },
  },
  // Posters
  POSTERS: {
    FEED: '/api/v1/posters',
    BY_USER: (userId: string) => `/api/v1/posters/user/${userId}`,
    BY_ID: (id: string) => `/api/v1/posters/${id}`,
    CREATE: '/api/v1/posters',
    REACT: (id: string) => `/api/v1/posters/${id}/reactions`,
    COMMENT: (id: string) => `/api/v1/posters/${id}/comments`,
  },
  // Stories
  STORIES: {
    FEED: '/api/v1/stories',
    BY_USER: (userId: string) => `/api/v1/stories/user/${userId}`,
    CREATE: '/api/v1/stories',
  },
  // Wishlists
  WISHLISTS: {
    LIST: '/api/v1/wishlists',
    CREATE: '/api/v1/wishlists',
    BY_ID: (id: string) => `/api/v1/wishlists/${id}`,
    UPDATE: (id: string) => `/api/v1/wishlists/${id}`,
    DELETE: (id: string) => `/api/v1/wishlists/${id}`,
    BY_USER: (userId: string) => `/api/v1/wishlists/${userId}`,
    ADD_ITEM: (id: string) => `/api/v1/wishlists/${id}/items`,
    REMOVE_ITEM: (id: string, itemId: string) => `/api/v1/wishlists/${id}/items/${itemId}`,
  },
  // Regions
  REGIONS: '/api/v1/regions',
  // StalkerGift
  STALKER_GIFT: {
    CREATE: '/api/v1/stalker-gift',
    BY_ID: (id: string) => `/api/v1/stalker-gift/${id}`,
    BY_USER: (userId: string) => `/api/v1/stalker-gift/user/${userId}`,
    UPDATE_PAYMENT: (id: string) => `/api/v1/stalker-gift/${id}/payment-status`,
    ENABLE_CHAT: (id: string) => `/api/v1/stalker-gift/${id}/enable-chat`,
  },
  // Groups (Red Tanku)
  GROUPS: {
    LIST: '/api/v1/groups',
    RECOMMENDED: '/api/v1/groups/recommended',
    BY_ID: (id: string) => `/api/v1/groups/${id}`,
    CREATE: '/api/v1/groups',
    UPDATE: (id: string) => `/api/v1/groups/${id}`,
    DELETE: (id: string) => `/api/v1/groups/${id}`,
    ADD_MEMBER: (id: string) => `/api/v1/groups/${id}/members`,
    REMOVE_MEMBER: (id: string, memberId: string) => `/api/v1/groups/${id}/members/${memberId}`,
  },
  // Friends
  FRIENDS: {
    LIST: '/api/v1/friends',
    REQUESTS: '/api/v1/friends/requests',
    REQUESTS_SENT: '/api/v1/friends/requests/sent',
    SEND_REQUEST: '/api/v1/friends/requests',
    UPDATE_REQUEST: (id: string) => `/api/v1/friends/requests/${id}`,
    CANCEL_REQUEST: (id: string) => `/api/v1/friends/requests/${id}`,
    REMOVE: (friendId: string) => `/api/v1/friends/${friendId}`,
    SUGGESTIONS: '/api/v1/friends/suggestions',
    BLOCK: '/api/v1/friends/block',
    UNBLOCK: (userId: string) => `/api/v1/friends/block/${userId}`,
    BLOCKED: '/api/v1/friends/blocked',
  },
  // Notifications
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    UNREAD_COUNT: '/api/v1/notifications/unread-count',
    MARK_READ: (id: string) => `/api/v1/notifications/${id}/read`,
    MARK_ALL_READ: '/api/v1/notifications/read-all',
    DELETE: (id: string) => `/api/v1/notifications/${id}`,
  },
  // Chat
  CHAT: {
    CONVERSATIONS: '/api/v1/chat/conversations',
    CONVERSATION_BY_ID: (id: string) => `/api/v1/chat/conversations/${id}`,
    MESSAGES: (id: string) => `/api/v1/chat/conversations/${id}/messages`,
    SEND_MESSAGE: (id: string) => `/api/v1/chat/conversations/${id}/messages`,
    MARK_READ: (id: string) => `/api/v1/chat/conversations/${id}/read`,
    CLOSE: (id: string) => `/api/v1/chat/conversations/${id}/close`,
    UNREAD_COUNT: '/api/v1/chat/unread-count',
  },
} as const

