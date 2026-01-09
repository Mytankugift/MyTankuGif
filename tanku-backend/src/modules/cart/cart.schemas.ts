import { z } from 'zod';

/**
 * Schemas de validación Zod para módulo Cart
 */

export const createCartSchema = z.object({
  body: z.object({
    regionId: z.string().optional(),
  }),
});

export const addItemSchema = z.object({
  body: z.object({
    variantId: z.string().min(1, 'variantId es requerido'),
    quantity: z.number().int().positive('La cantidad debe ser un número positivo'),
  }),
});

export const updateItemSchema = z.object({
  params: z.object({
    itemId: z.string().min(1, 'itemId es requerido'),
  }),
  body: z.object({
    quantity: z.number().int().positive('La cantidad debe ser un número positivo'),
  }),
});

export const deleteItemSchema = z.object({
  params: z.object({
    itemId: z.string().min(1, 'itemId es requerido'),
  }),
});

