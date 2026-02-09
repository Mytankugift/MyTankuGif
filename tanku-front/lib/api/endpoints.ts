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
    TOP: '/api/v1/products/top',
    BY_HANDLE: (handle: string) => `/api/v1/products/${handle}`,
    VARIANT_BY_ID: (variantId: string) => `/api/v1/products/variant/${variantId}`,
    LIKE: (productId: string) => `/api/v1/products/${productId}/like`,
    UNLIKE: (productId: string) => `/api/v1/products/${productId}/like`,
    LIKES_COUNT: (productId: string) => `/api/v1/products/${productId}/likes`,
    IS_LIKED: (productId: string) => `/api/v1/products/${productId}/liked`,
    LIKED: '/api/v1/products/liked',
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
    GET_GIFT: '/api/v1/cart/gift',
    CREATE: '/api/v1/cart',
    ADD_ITEM: '/api/v1/cart/items',
    ADD_GIFT_ITEM: '/api/v1/cart/gift-items',
    UPDATE_ITEM: (itemId: string) => `/api/v1/cart/items/${itemId}`,
    DELETE_ITEM: (itemId: string) => `/api/v1/cart/items/${itemId}`,
  },
  // Gifts
  GIFTS: {
    RECIPIENT_ELIGIBILITY: (userId: string) => `/api/v1/gifts/recipient/${userId}/eligibility`,
    ORDERS: '/api/v1/gifts/orders',
  },
  // Orders
  ORDERS: {
    CREATE: '/api/v1/orders',
    LIST: '/api/v1/orders',
    STALKER_GIFTS: '/api/v1/orders/stalker-gifts',
    BY_ID: (id: string) => `/api/v1/orders/${id}`,
    BY_TRANSACTION_ID: (transactionId: string) => `/api/v1/orders/transaction/${transactionId}`,
    DELETE: (id: string) => `/api/v1/orders/${id}`,
  },
  // Checkout
  CHECKOUT: {
    ADD_ORDER: '/api/v1/checkout/add-order',
    GIFT_DIRECT: '/api/v1/checkout/gift-direct',
  },
  // Users
  USERS: {
    ME: '/api/v1/users/me',
    BY_ID: (userId: string) => `/api/v1/users/${userId}`,
    BY_USERNAME: (username: string) => `/api/v1/users/by-username/${username}`,
    PROFILE: {
      GET: '/api/v1/users/me/profile',
      UPDATE: '/api/v1/users/me/profile',
    },
    PROFILE_AVATAR: '/api/v1/users/me/profile/avatar',
    PROFILE_BANNER: '/api/v1/users/me/profile/banner',
    SEARCH: '/api/v1/users/search',
    GET_BY_IDS: '/api/v1/users/by-ids',
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
    COMMENT_LIKE: (posterId: string, commentId: string) => `/api/v1/posters/${posterId}/comments/${commentId}/like`,
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
    SAVED: '/api/v1/wishlists/saved',
    CREATE: '/api/v1/wishlists',
    BY_ID: (id: string) => `/api/v1/wishlists/${id}`,
    UPDATE: (id: string) => `/api/v1/wishlists/${id}`,
    DELETE: (id: string) => `/api/v1/wishlists/${id}`,
    BY_USER: (userId: string) => `/api/v1/wishlists/${userId}`,
    ADD_ITEM: (id: string) => `/api/v1/wishlists/${id}/items`,
    REMOVE_ITEM: (id: string, itemId: string) => `/api/v1/wishlists/${id}/items/${itemId}`,
    SAVE: (id: string) => `/api/v1/wishlists/${id}/save`,
    UNSAVE: (id: string) => `/api/v1/wishlists/${id}/save`,
    SHARE_TOKEN: (id: string) => `/api/v1/wishlists/${id}/share-token`,
    BY_SHARE_TOKEN: (token: string) => `/api/v1/wishlists/share/${token}`,
    REQUEST_ACCESS: (wishlistId: string) => `/api/v1/wishlists/${wishlistId}/request-access`,
    CANCEL_ACCESS_REQUEST: (wishlistId: string) => `/api/v1/wishlists/${wishlistId}/request-access`,
    ACCESS_REQUESTS: '/api/v1/wishlists/access-requests',
    APPROVE_ACCESS_REQUEST: (requestId: string) => `/api/v1/wishlists/access-requests/${requestId}/approve`,
    REJECT_ACCESS_REQUEST: (requestId: string) => `/api/v1/wishlists/access-requests/${requestId}/reject`,
    PENDING_REQUESTS: (userId: string) => `/api/v1/wishlists/pending-requests?userId=${userId}`,
    ACCESS_GRANTS: (wishlistId: string) => `/api/v1/wishlists/${wishlistId}/access-grants`,
    REVOKE_ACCESS: (wishlistId: string, userId: string) => `/api/v1/wishlists/${wishlistId}/access-grants/${userId}`,
    REVOKE_ALL_ACCESS: (wishlistId: string) => `/api/v1/wishlists/${wishlistId}/access-grants`,
    LIKED: '/api/v1/wishlists/liked', // Wishlist automática "Me gusta"
    RECOMMENDED: '/api/v1/wishlists/recommended', // Wishlists recomendadas (plantillas)
  },
  // Regions
  REGIONS: '/api/v1/regions',
  // StalkerGift
  STALKER_GIFT: {
    CREATE: '/api/v1/stalker-gift',
    BY_ID: (id: string) => `/api/v1/stalker-gift/${id}`,
    BY_TOKEN: (token: string) => `/api/v1/stalker-gift/public/${token}`,
    SENT: '/api/v1/stalker-gift/sent',
    RECEIVED: '/api/v1/stalker-gift/received',
    ACCEPT: (id: string) => `/api/v1/stalker-gift/${id}/accept`,
    REJECT: (id: string) => `/api/v1/stalker-gift/${id}/reject`,
    CANCEL: (id: string) => `/api/v1/stalker-gift/${id}/cancel`,
    CAN_COMPLETE_ACCEPTANCE: (id: string) => `/api/v1/stalker-gift/${id}/can-complete-acceptance`,
    CAN_VIEW_PROFILE: (id: string) => `/api/v1/stalker-gift/${id}/can-view-profile`,
    PROFILE_VISIBILITY: (id: string) => `/api/v1/stalker-gift/${id}/profile-visibility`,
    REVEAL_IDENTITY: (id: string) => `/api/v1/stalker-gift/${id}/reveal-identity`,
    GENERATE_LINK: (id: string) => `/api/v1/stalker-gift/${id}/generate-link`,
    CHECKOUT: '/api/v1/stalker-gift/checkout',
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
  // Consent
  CONSENT: {
    SAVE: '/api/v1/consent',
  },
  // Dropi (Departamentos y Ciudades)
  DROPI: {
    DEPARTMENTS: '/api/v1/dropi/departments',
    CITIES: '/api/v1/dropi/cities',
  },
} as const

