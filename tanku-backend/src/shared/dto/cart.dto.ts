/**
 * DTOs para módulo de carrito
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type CartItemDTO = {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: string;
  product?: {
    id: string;
    title: string;
    handle: string;
    images: string[];
  };
  variant?: {
    id: string;
    sku: string;
    title: string;
    tankuPrice: number; // Precio final calculado (único precio expuesto al frontend)
    stock: number;
  };
};

export type CartDTO = {
  id: string;
  userId?: string | null;
  items: CartItemDTO[];
  subtotal: number;
  total: number;
  region?: any; // TODO: Implementar cuando tengamos regiones
  createdAt: string;
  updatedAt: string;
  isGiftCart?: boolean; // Indica si es carrito de regalos
  giftRecipientId?: string | null; // ID del usuario que recibirá el regalo
};

