/**
 * DTOs para módulo de órdenes
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type OrderItemDTO = {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  finalPrice?: number;
  dropiOrderId?: number | null;
  dropiShippingCost?: number | null; // discounted_amount (costo de envío)
  dropiDropshipperWin?: number | null; // dropshipper_amount_to_win (ganancia)
  dropiStatus?: string | null;
  product: {
    id: string;
    title: string;
    handle: string;
  };
  variant: {
    id: string;
    sku: string;
    title: string;
    price: number;
  };
};

export type OrderAddressDTO = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type OrderDTO = {
  id: string;
  userId: string;
  email: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
  subtotal: number;
  shippingTotal: number;
  dropiOrderIds: number[];
  isStalkerGift: boolean;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
  address: OrderAddressDTO | null;
  items: OrderItemDTO[];
};

