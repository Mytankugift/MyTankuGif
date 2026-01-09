export interface FeedItem {
  id: string
  type: 'product' | 'poster'
  createdAt: string
  title?: string
  imageUrl: string
  price?: number
  category?: {
    id: string
    name: string
    handle: string
  }
  handle?: string
  likesCount?: number
  commentsCount?: number
  description?: string | null
  videoUrl?: string | null
  author?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    avatar: string | null
  }
}

export interface FeedResponse {
  items: FeedItem[]
  nextCursorToken: string | null
}

export interface FeedFilters {
  categoryId?: string | null
  searchQuery?: string
}

