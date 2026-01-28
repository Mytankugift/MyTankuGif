/**
 * DTOs para feed combinado (products + posters)
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

/**
 * Cursor híbrido para feed combinado
 * Trackea productos (por ranking) y posts (por fecha) por separado
 */
export type FeedCursorDTO = {
  // Para productos (ordenados por ranking)
  lastProductScore?: number;
  lastProductCreatedAt?: string;
  lastProductId?: string;
  
  // Para posts (ordenados por fecha)
  lastPostCreatedAt?: string;
  lastPostId?: string;
  
  // Información del último item mostrado (para continuidad)
  lastItemType?: 'product' | 'poster';
  lastItemIndex?: number; // Posición en la intercalación (0-based)
  
  // Compatibilidad con cursor anterior (legacy)
  lastGlobalScore?: number;
  lastCreatedAt?: string;
  lastItemId?: string;
};

export type FeedItemDTO = {
  id: string;
  type: 'product' | 'poster';
  createdAt: string;

  // Campos de producto
  title?: string;
  imageUrl: string;
  price?: number;
  handle?: string; // Handle del producto para obtener detalles
  category?: {
    id: string;
    name: string;
    handle: string;
  };

  // Campos de poster
  likesCount?: number; // Para posters y productos
  commentsCount?: number;
  description?: string;
  videoUrl?: string | null;
  author?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
  
  // Campos adicionales para productos
  isLiked?: boolean; // Si el usuario actual le dio like (solo productos)
};

export type FeedResponseDTO = {
  items: FeedItemDTO[];
  nextCursorToken: string | null; // Token corto para siguiente página (enviar en header X-Feed-Cursor)
};

