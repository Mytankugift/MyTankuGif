/**
 * DTOs para módulo de wishlists
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type WishListItemDTO = {
  id: string;
  productId: string;
  variantId?: string | null;
  variant?: {
    id: string;
    title: string;
    price: number;
  } | null;
  product: {
    id: string;
    title: string;
    handle: string;
    thumbnail: string | null;
    // Información completa del producto para StalkerGift
    images?: string[];
    variants?: Array<{
      id: string;
      sku: string;
      title: string;
      price: number;
      suggestedPrice?: number | null;
      stock: number;
      active: boolean;
    }>;
    description?: string;
    category?: {
      id: string;
      name: string;
      handle: string;
    };
    active?: boolean;
  };
  createdAt: string;
};

export type WishListDTO = {
  id: string;
  userId: string;
  name: string;
  public: boolean;
  items: WishListItemDTO[];
  createdAt: string;
  updatedAt: string;
};

