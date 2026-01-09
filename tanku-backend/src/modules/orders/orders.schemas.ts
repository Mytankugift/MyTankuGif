import { z } from 'zod';

/**
 * Schemas de validación Zod para módulo Orders
 */

export const createOrderSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    paymentMethod: z.string().min(1, 'El método de pago es requerido'),
    total: z.number().positive('El total debe ser positivo'),
    subtotal: z.number().positive('El subtotal debe ser positivo'),
    shippingTotal: z.number().nonnegative('El shipping total no puede ser negativo').optional(),
    address: z.object({
      firstName: z.string().min(1, 'El nombre es requerido'),
      lastName: z.string().min(1, 'El apellido es requerido'),
      phone: z.string().min(1, 'El teléfono es requerido'),
      address1: z.string().min(1, 'La dirección es requerida'),
      detail: z.string().optional(),
      city: z.string().min(1, 'La ciudad es requerida'),
      state: z.string().min(1, 'El estado/departamento es requerido'),
      postalCode: z.string().min(1, 'El código postal es requerido'),
      country: z.string().default('CO'),
    }),
    items: z.array(z.object({
      productId: z.string().min(1, 'productId es requerido'),
      variantId: z.string().min(1, 'variantId es requerido'),
      quantity: z.number().int().positive('La cantidad debe ser un número positivo'),
      price: z.number().positive('El precio debe ser positivo'),
    })).min(1, 'La orden debe tener al menos un item'),
    isStalkerGift: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const getOrderSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'El ID de la orden es requerido'),
  }),
  query: z.object({
    userId: z.string().optional(),
    customer_id: z.string().optional(),
  }),
});

export const getUserOrdersSchema = z.object({
  query: z.object({
    userId: z.string().optional(),
    customer_id: z.string().optional(),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  }),
});

